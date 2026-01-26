import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

/* ---------- CORS ---------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  /* ---------- CORS PREFLIGHT ---------- */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    /* ---------- ENV (SAFE) ---------- */
    const PROJECT_URL = Deno.env.get("PROJECT_URL")
    const PROJECT_ANON_KEY = Deno.env.get("PROJECT_ANON_KEY")
    const PROJECT_SERVICE_ROLE_KEY = Deno.env.get("PROJECT_SERVICE_ROLE_KEY")
    const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")
    const DISCORD_CHANNEL_ID = Deno.env.get("DISCORD_CHANNEL_ID")

    if (
      !PROJECT_URL ||
      !PROJECT_ANON_KEY ||
      !PROJECT_SERVICE_ROLE_KEY ||
      !DISCORD_BOT_TOKEN ||
      !DISCORD_CHANNEL_ID
    ) {
      console.error("Missing required environment variables")
      return new Response("Server misconfigured", {
        status: 500,
        headers: corsHeaders,
      })
    }

    /* ---------- AUTH HEADER ---------- */
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response("Missing Authorization header", {
        status: 401,
        headers: corsHeaders,
      })
    }

    const jwt = authHeader.replace("Bearer ", "")

    /* ---------- SUPABASE CLIENTS ---------- */
    const supabaseUserClient = createClient(
      PROJECT_URL,
      PROJECT_ANON_KEY,
      {
        global: {
          headers: { Authorization: `Bearer ${jwt}` },
        },
      }
    )

    const supabaseAdmin = createClient(
      PROJECT_URL,
      PROJECT_SERVICE_ROLE_KEY
    )

    const {
      data: { user },
    } = await supabaseUserClient.auth.getUser()

    if (!user) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      })
    }

    /* ---------- ROLE CHECK ---------- */
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      return new Response("Forbidden", {
        status: 403,
        headers: corsHeaders,
      })
    }

    /* ---------- PAYLOAD ---------- */
    const { action, event } = await req.json()
    let response

    /* ---------- CREATE ---------- */
    if (action === "create") {
      response = await fetch(
        `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            embeds: [
              {
                title: `📅 ${event.title}`,
                description: event.description || "No description provided.",
                color: 0x3b82f6,
                fields: [
                  { name: "Field", value: event.field, inline: true },
                  {
                    name: "Time",
                    value: new Date(event.start_time).toLocaleString(),
                    inline: true,
                  },
                ],
                footer: { text: "HRG Airsoft – Upcoming Game" },
                timestamp: new Date(event.start_time).toISOString(),
              },
            ],
          }),
        }
      )
    }

    /* ---------- UPDATE ---------- */
    if (action === "update") {
      response = await fetch(
        `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages/${event.discord_message_id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            embeds: [
              {
                title: `📅 ${event.title}`,
                description: event.description || "No description provided.",
                color: 0xfacc15,
                fields: [
                  { name: "Field", value: event.field, inline: true },
                  {
                    name: "Time",
                    value: new Date(event.start_time).toLocaleString(),
                    inline: true,
                  },
                ],
                footer: { text: "HRG Airsoft – Event Updated" },
                timestamp: new Date(event.start_time).toISOString(),
              },
            ],
          }),
        }
      )
    }

    /* ---------- DELETE ---------- */
    if (action === "delete") {
      await fetch(
        `https://discord.com/api/v10/channels/${DISCORD_CHANNEL_ID}/messages/${event.discord_message_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
        }
      )

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      )
    }

    const data = await response!.json()

    return new Response(
      JSON.stringify({ discord_message_id: data.id }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (err) {
    console.error("Unhandled error:", err)
    return new Response("Internal Server Error", {
      status: 500,
      headers: corsHeaders,
    })
  }
})
