const isLocalHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);

window.APP_CONFIG = Object.assign(
  {
    mode: isLocalHost ? "local" : "supabase",
    localApiUrl: "/api/dataset",
    supabaseUrl: "https://satuytcvrmjovxoxbmxg.supabase.co",
    cloudWriteUrl: "https://satuytcvrmjovxoxbmxg.supabase.co/functions/v1/demo-write",
    supabaseAnonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhdHV5dGN2cm1qb3Z4b3hibXhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzAzMjAsImV4cCI6MjA5MDgwNjMyMH0.6XBAArJWgRlx8xcg_wEObYU1ipTkgYPN72rPCkwW34Y",
    schema: "public"
  },
  window.APP_CONFIG || {}
);
