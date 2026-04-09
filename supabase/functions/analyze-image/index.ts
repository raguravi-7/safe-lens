import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Detection {
  category: string;
  confidence: number;
  bounding_box: {
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image, mode } = await req.json();

    if (!image || typeof image !== "string") {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dataUrlMatch = image.match(/^data:image\/[a-z]+;base64,(.+)$/i);
    if (!dataUrlMatch || !dataUrlMatch[1] || dataUrlMatch[1].length < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid image data - please try again", detections: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use faster model for live camera, more accurate model for uploaded images
    const isLive = mode === "camera";
    const model = isLive ? "google/gemini-2.5-flash-lite" : "google/gemini-3-flash-preview";

    console.log(`Analyzing image (mode: ${mode || "image"}, model: ${model})...`);

    const systemPrompt = `You are a precision safety & surveillance detection AI. Analyze the image and detect ALL instances of these categories:

EMERGENCY ALERTS (highest priority — these trigger alarms):
- fight: Two or more people physically fighting, punching, kicking, wrestling, brawling, or in aggressive violent physical contact
- accident: Vehicle collision, car crash, road accident, person hit by vehicle, traffic incident, any road emergency
- fire: Visible fire, flames, smoke from burning, building fire, vehicle fire, wildfire, any fire emergency

OTHER DETECTIONS (report but no alarm):
- weapon_gun: Any firearm visible — pistol, rifle, shotgun
- weapon_knife: Any blade weapon — knife, machete, sword
- fainting: Person collapsed, unconscious, unresponsive
- bad_behavior: Vandalism, theft, suspicious activity
- person: Every individual human visible
- animal: Any animal

DETECTION RULES:
1. Report EVERY person individually with their own bounding box
2. One person can have multiple labels (e.g., a person fighting = both "person" and "fight")
3. Bounding boxes must tightly wrap the detected object/person using normalized 0.0-1.0 coordinates
4. Confidence must reflect actual certainty: only use >0.8 when very clear, use 0.3-0.6 for partial/unclear
5. Never hallucinate detections — only report what is clearly visible
6. For fire: detect even small flames or heavy smoke`;

    const userPrompt = isLive
      ? "Analyze this live camera frame. Focus on detecting fighting/violence, road accidents, and fire emergencies. Also identify people and other threats."
      : "Thoroughly analyze this image. Prioritize detecting fighting/violence, road accidents, and fire emergencies. Also identify every person, animal, weapon, or suspicious behavior.";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detections",
              description: "Report all detected objects, people, threats, and situations found in the image with precise bounding boxes",
              parameters: {
                type: "object",
                properties: {
                  detections: {
                    type: "array",
                    description: "Array of all detections found in the image. Each person should be reported individually.",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["fight", "weapon_gun", "weapon_knife", "accident", "fire", "fainting", "bad_behavior", "person", "animal"],
                        },
                        confidence: {
                          type: "number",
                          description: "Confidence score 0.0-1.0. Use >0.8 only when very clear.",
                        },
                        bounding_box: {
                          type: "object",
                          description: "Tight bounding box in normalized 0.0-1.0 coordinates",
                          properties: {
                            x_min: { type: "number", description: "Left edge 0.0-1.0" },
                            y_min: { type: "number", description: "Top edge 0.0-1.0" },
                            x_max: { type: "number", description: "Right edge 0.0-1.0" },
                            y_max: { type: "number", description: "Bottom edge 0.0-1.0" },
                          },
                          required: ["x_min", "y_min", "x_max", "y_max"],
                        },
                      },
                      required: ["category", "confidence", "bounding_box"],
                    },
                  },
                  image_width: { type: "number", description: "Estimated width in pixels" },
                  image_height: { type: "number", description: "Estimated height in pixels" },
                },
                required: ["detections"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_detections" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    let detections: Detection[] = [];
    let imageWidth = 1280;
    let imageHeight = 720;

    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
        detections = (args.detections || []).filter((d: Detection) => {
          // Filter out invalid detections
          if (!d.category || typeof d.confidence !== "number") return false;
          if (d.confidence < 0.15) return false; // Drop very low confidence noise
          const bb = d.bounding_box;
          if (!bb || bb.x_min >= bb.x_max || bb.y_min >= bb.y_max) return false;
          if (bb.x_min < 0 || bb.y_min < 0 || bb.x_max > 1.05 || bb.y_max > 1.05) return false;
          // Clamp to valid range
          d.bounding_box.x_min = Math.max(0, Math.min(1, bb.x_min));
          d.bounding_box.y_min = Math.max(0, Math.min(1, bb.y_min));
          d.bounding_box.x_max = Math.max(0, Math.min(1, bb.x_max));
          d.bounding_box.y_max = Math.max(0, Math.min(1, bb.y_max));
          return true;
        });
        imageWidth = args.image_width || 1280;
        imageHeight = args.image_height || 720;
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    console.log(`Detected ${detections.length} objects`);

    return new Response(
      JSON.stringify({ detections, image_width: imageWidth, image_height: imageHeight }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
