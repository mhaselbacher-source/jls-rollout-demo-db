const isLocalHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);

window.APP_CONFIG = Object.assign(
  {
    mode: isLocalHost ? "local" : "supabase",
    localApiUrl: "/api/dataset",
    supabaseUrl: "https://woufcdjretcwcgqrbdgt.supabase.co",
    supabaseAnonKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvdWZjZGpyZXRjd2NncXJiZGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxOTg2OTYsImV4cCI6MjA5MDc3NDY5Nn0.AzL_MkZSeCXZrfCt80zWAYlJGwq_J5pnkPFgdaDCvPA",
    schema: "public"
  },
  window.APP_CONFIG || {}
);
