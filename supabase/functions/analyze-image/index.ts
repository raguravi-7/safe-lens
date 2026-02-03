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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    // Validate image data URL - must have actual base64 content
    if (!image || typeof image !== 'string') {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if it's a valid data URL with actual content
    const dataUrlMatch = image.match(/^data:image\/[a-z]+;base64,(.+)$/i);
    if (!dataUrlMatch || !dataUrlMatch[1] || dataUrlMatch[1].length < 100) {
      console.error("Invalid image data URL - too short or malformed");
      return new Response(
        JSON.stringify({ error: "Invalid image data - please try again", detections: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing image for safety detections...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a safety detection AI. Analyze images for dangerous situations and objects.

Detect these categories:
- fight: Physical altercation between people
- weapon_gun: Any firearm (pistol, rifle, etc.)
- weapon_knife: Knives, blades, or sharp weapons
- accident: Car crashes, falls, injuries
- fainting: Person collapsed, unconscious
- bad_behavior: Vandalism, suspicious activity
- person: Any human present
- animal: Any animal present

For each detection, provide:
- category: The detection type
- confidence: 0.0 to 1.0 confidence score
- bounding_box: Normalized coordinates (0.0 to 1.0) with x_min, y_min, x_max, y_max

Be thorough but accurate. Only report what you can clearly see.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image for safety-related detections. Return all detected objects, people, dangerous situations, and potential threats."
              },
              {
                type: "image_url",
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_detections",
              description: "Report all detected objects and situations in the image",
              parameters: {
                type: "object",
                properties: {
                  detections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: {
                          type: "string",
                          enum: ["fight", "weapon_gun", "weapon_knife", "accident", "fainting", "bad_behavior", "person", "animal"]
                        },
                        confidence: {
                          type: "number",
                          description: "Confidence score between 0.0 and 1.0"
                        },
                        bounding_box: {
                          type: "object",
                          properties: {
                            x_min: { type: "number", description: "Left edge (0.0-1.0)" },
                            y_min: { type: "number", description: "Top edge (0.0-1.0)" },
                            x_max: { type: "number", description: "Right edge (0.0-1.0)" },
                            y_max: { type: "number", description: "Bottom edge (0.0-1.0)" }
                          },
                          required: ["x_min", "y_min", "x_max", "y_max"]
                        }
                      },
                      required: ["category", "confidence", "bounding_box"]
                    }
                  },
                  image_width: {
                    type: "number",
                    description: "Estimated image width in pixels"
                  },
                  image_height: {
                    type: "number",
                    description: "Estimated image height in pixels"
                  }
                },
                required: ["detections"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "report_detections" } }
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
    console.log("AI response received:", JSON.stringify(data).substring(0, 500));

    // Extract tool call result
    let detections: Detection[] = [];
    let imageWidth = 1280;
    let imageHeight = 720;

    if (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments) {
      try {
        const args = JSON.parse(data.choices[0].message.tool_calls[0].function.arguments);
        detections = args.detections || [];
        imageWidth = args.image_width || 1280;
        imageHeight = args.image_height || 720;
      } catch (parseError) {
        console.error("Failed to parse tool call arguments:", parseError);
      }
    }

    console.log(`Detected ${detections.length} objects`);

    return new Response(
      JSON.stringify({
        detections,
        image_width: imageWidth,
        image_height: imageHeight,
      }),
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
