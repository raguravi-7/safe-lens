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

    const isLive = mode === "camera";
    const model = isLive ? "google/gemini-2.5-flash" : "google/gemini-2.5-pro";

    console.log(`Analyzing image (mode: ${mode || "image"}, model: ${model})...`);

    const systemPrompt = `You are an expert safety and surveillance detection AI with high accuracy. Analyze the image carefully and detect ALL visible instances of these categories:

CRITICAL ALERTS (trigger emergency alarms):
- fight: Physical violence — punching, kicking, wrestling, brawling, aggressive physical contact between people
- accident: Vehicle collision, car crash, road accident, overturned vehicle, person hit by vehicle
- fire: Visible flames, heavy smoke, burning objects, building/vehicle/wildfire
- weapon_gun: Any visible firearm — pistol, rifle, shotgun, handgun
- weapon_knife: Any visible blade — knife, machete, sword, dagger

STANDARD DETECTIONS (always report):
- person: Every individual human visible in the image. Report each person separately.
- animal: Any animal — dogs, cats, birds, livestock, wildlife

OTHER (report if clearly visible):
- fainting: Person collapsed on ground, unconscious, unresponsive
- bad_behavior: Vandalism, theft in progress, trespassing, suspicious activity

ACCURACY RULES:
1. Be thorough: detect EVERY person and animal individually with separate bounding boxes
2. Be precise: bounding boxes must tightly wrap the detected subject using normalized 0.0-1.0 coordinates
3. Be honest: confidence must reflect actual certainty. Use >0.85 only when detection is unmistakable. Use 0.4-0.7 for partially visible or uncertain detections.
4. NEVER hallucinate: only report what is clearly visible in the image
5. One subject can have multiple labels (e.g. a person holding a knife = both "person" and "weapon_knife")
6. For weapons: look carefully at hands and objects being carried
7. For fire: detect even small flames, sparks, or thick smoke`;

    const userPrompt = isLive
      ? "Analyze this live camera frame quickly. Detect all people, animals, weapons, fighting, accidents, and fire."
      : "Thoroughly analyze this image with maximum accuracy. Detect every person, animal, weapon, fight, accident, fire, and any suspicious activity. Be comprehensive — do not miss any detection.";

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
                    description: "Array of all detections. Report each person/animal individually.",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["fight", "weapon_gun", "weapon_knife", "accident", "fire", "fainting", "bad_behavior", "person", "animal"],
                        },
                        confidence: {
                          type: "number",
                          description: "Confidence 0.0-1.0. >0.85 only for unmistakable detections.",
                        },
                        bounding_box: {
                          type: "object",
                          description: "Tight bounding box in normalized 0.0-1.0 coordinates",
                          properties: {
                            x_min: { type: "number" },
                            y_min: { type: "number" },
                            x_max: { type: "number" },
                            y_max: { type: "number" },
                          },
                          required: ["x_min", "y_min", "x_max", "y_max"],
                        },
                      },
                      required: ["category", "confidence", "bounding_box"],
                    },
                  },
                  image_width: { type: "number" },
                  image_height: { type: "number" },
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
          if (!d.category || typeof d.confidence !== "number") return false;
          if (d.confidence < 0.12) return false;
          const bb = d.bounding_box;
          if (!bb || bb.x_min >= bb.x_max || bb.y_min >= bb.y_max) return false;
          if (bb.x_min < -0.05 || bb.y_min < -0.05 || bb.x_max > 1.1 || bb.y_max > 1.1) return false;
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