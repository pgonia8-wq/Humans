export default async function handler(req, res) {

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {

    const chunks = [];

    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const body = Buffer.concat(chunks).toString() || "{}";
    const data = JSON.parse(body);

    const { plan } = data;

    console.log("Upgrade request:", plan);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      success: true,
      plan: plan || null
    }));

  } catch (err) {

    console.error("API ERROR:", err);

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      success: false,
      error: err.message
    }));

  }

      }
