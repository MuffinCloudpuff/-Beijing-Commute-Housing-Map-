import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: "50mb" }));

  // API Route to extract locations from an image
  app.post("/api/extract-locations", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing image data" });
      }

      let response;
      let retries = 5;
      while (true) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType,
                  }
                },
                {
                  text: "Extract the locations, projects, or places mentioned in this image. For each item, provide the short name (usually under '项目名称' or similar, like 燕保·百湾家园) and the detailed full address (usually under '详细地址' or '项目位置'). Return a list of these objects."
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    shortName: { type: Type.STRING },
                    fullAddress: { type: Type.STRING },
                  },
                  required: ["shortName", "fullAddress"],
                }
              }
            }
          });
          break; // success, break loop
        } catch (error: any) {
          if (retries > 0 && (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('retry in'))) {
            retries--;
            let waitTime = 15000; // default 15s delay if not found
            const retryMatch = error.message?.match(/retry in (\d+(\.\d+)?)s/);
            if (retryMatch) {
              waitTime = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 1000;
            }
            console.log(`Rate limit hit. Retrying in ${waitTime}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw error; // throw to outer catch if out of retries or other error
          }
        }
      }
      
      const text = response.text || "[]";
      try {
        const locations = JSON.parse(text.trim());
        res.json({ locations });
      } catch (err) {
        res.json({ locations: [] });
      }
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route to extract room layout from a floor plan image
  app.post("/api/extract-floor-plan", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({ error: "Missing image data" });
      }

      let response;
      let retries = 5;
      while (true) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: {
              parts: [
                {
                  inlineData: {
                    data: imageBase64,
                    mimeType,
                  }
                },
                {
                  text: "Analyze this floor plan image. Identify the major rooms (living room, bedroom, kitchen, bathroom, etc.). Estimate their relative proportions as widthPixels and heightPixels (e.g. 200 to 400 pixels typical range). Return a list of rooms."
                }
              ]
            },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Name of the room" },
                    widthPixels: { type: Type.NUMBER, description: "Estimated width in pixels for rendering layout (e.g. 250)" },
                    heightPixels: { type: Type.NUMBER, description: "Estimated height in pixels for rendering layout (e.g. 300)" },
                  },
                  required: ["name", "widthPixels", "heightPixels"],
                }
              }
            }
          });
          break;
        } catch (error: any) {
          if (retries > 0 && (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('retry in'))) {
            retries--;
            let waitTime = 15000;
            const retryMatch = error.message?.match(/retry in (\d+(\.\d+)?)s/);
            if (retryMatch) {
              waitTime = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 1000;
            }
            console.log(`Rate limit hit. Retrying in ${waitTime}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw error;
          }
        }
      }
      
      const text = response.text || "[]";
      try {
        const rooms = JSON.parse(text.trim());
        res.json({ rooms });
      } catch (err) {
        res.json({ rooms: [] });
      }
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
