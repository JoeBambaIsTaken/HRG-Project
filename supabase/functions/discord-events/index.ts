import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const DISCORD_BOT_TOKEN = Deno.env.get("MTQ2NDk3ODE2NDQwODI1ODU4MA.GoC2JX.qkh4gY-qmHBGqW6gLhmtxc5bKEvGaL24L3Q8j8")!
const DISCORD_GUILD_ID = Deno.env.get("866467652552622120")!
const DISCORD_CHANNEL_ID = Deno.env.get("866467652552622123")!

const SUPABASE_URL = Deno.env.get("https://lxtnwqwlgrmvkonfwram.supabase.co")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dG53cXdsZ3JtdmtvbmZ3cmFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3Mzg0MCwiZXhwIjoyMDg0ODQ5ODQwfQ.JF-1K22gbwkDLAyr2gQLSXSakiqVjH8rqlI_ZiIgOXs")!

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
)

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response("Missing Authorization header", { status: 401 })
    }

    const jwt = authHeader.replace("Bearer ", "")

    const supabaseUserClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      }
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUserClient.auth.getUser()

    if (userError || !user) {
      return new Response("Unauthorized", { status: 401 })
    }

    // 🔒 Role check
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      return new Response("Forbidden", { status: 403 })
    }

    const { action, event } = await req.json()

    if (!action || !event) {
      return new Response("Invalid payload", { status: 400 })
    }

    let discordResponse

    // ---------- CREATE ----------
    if (action === "create") {
      discordResponse = await fetch(
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
                footer: {
                  text: "HRG Airsoft – Upcoming Game",
                },
                timestamp: new Date(event.start_time).toISOString(),
              },
            ],
          }),
        }
      )
    }

    // ---------- UPDATE ----------
    if (action === "update") {
      discordResponse = await fetch(
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
                footer: {
                  text: "HRG Airsoft – Event Updated",
                },
                timestamp: new Date(event.start_time).toISOString(),
              },
            ],
          }),
        }
      )
    }

    // ---------- DELETE ----------
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
        { headers: { "Content-Type": "application/json" } }
      )
    }

    const discordData = await discordResponse.json()

    return new Response(
      JSON.stringify({
        discord_message_id: discordData.id,
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error(err)
    return new Response("Internal Server Error", { status: 500 })
  }
})
