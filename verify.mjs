export default async function handler(req, res) {
  console.log("BODY RECEIVED:", req.body);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false });
  }

  const { action, max_age } = req.body || {};

  if (!action) {
    return res.status(400).json({
      success: false,
      error: "Missing action",
    });
  }

  try {
    const response = await fetch(
      "https://developer.worldcoin.org/api/v2/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RP_SIGNING_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.APP_ID,
          action,
          signal: "",
          max_age: max_age || 7200,
        }),
      }
    );

    const data = await response.json();
    console.log("WORLD RESPONSE:", data);

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({
        success: false,
        error: "World verification failed",
        world_response: data,
      });
    }
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
        }
