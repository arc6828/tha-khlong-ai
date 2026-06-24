// ยิงคำขอเรียกใช้ Google Gemini API สด เพื่อแปลง Prompt ข้อความของเด็กเป็นโครงสร้างรูปภาพเวกเตอร์ SVG XML
export async function fetchGeminiSvg(prompt: string, apiKey: string): Promise<string> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert SVG designer. Create a beautiful, clean, extremely cute vector illustration in SVG format for children.
The drawing requests are accumulated from different children in a classroom. You MUST combine all of the following elements/requests into one single, cohesive, beautiful scene:
${prompt}

Guidelines:
1. The SVG MUST have viewBox="0 0 800 600" and use width="100%" height="100%".
2. Use simple, colorful flat vector shapes: <rect>, <circle>, <ellipse>, <path>, <polygon>, <g>, etc.
3. Ensure it has a solid colorful background element (like <rect width="800" height="600" fill="..."/>) to act as a nice drawing background canvas sheet.
4. All text elements should be clearly visible with readable fonts.
5. Make it completely self-contained. Do not use external image references.`
          }]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              svg: {
                type: 'STRING',
                description: 'The raw, clean, valid XML SVG code without any markdown wrapping.'
              }
            },
            required: ['svg']
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let svg = '';
    try {
      const parsed = JSON.parse(text);
      svg = parsed.svg || '';
    } catch (parseErr) {
      console.warn('Failed to parse Gemini Structured JSON response, attempting raw tag search:', parseErr);
      svg = text;
    }

    // ล้างตัวอักษรขยะนอกขอบเขต SVG XML
    const startIndex = svg.indexOf('<svg');
    const endIndex = svg.lastIndexOf('</svg>');
    if (startIndex !== -1 && endIndex !== -1) {
      svg = svg.substring(startIndex, endIndex + 6);
    } else {
      throw new Error('Returned text does not contain valid <svg> tag');
    }

    return svg;
  } catch (error) {
    console.error('fetchGeminiSvg Error:', error);
    throw error;
  }
}
