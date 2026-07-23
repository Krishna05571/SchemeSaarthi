const BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (err) {
    throw new Error(
      "Can't reach the backend. Make sure your FastAPI server is running (uvicorn main:app --reload)."
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Request failed.");
  }
  return res.json();
}

export const getAdvisor = (profile, question) =>
  request("/api/advisor", {
    method: "POST",
    body: JSON.stringify({ profile, question: question || null }),
  });

export const getSchemeDetail = (slug) => request(`/api/schemes/${slug}`);

export const askChat = (question, { slug, persona } = {}) =>
  request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ question, slug: slug || null, persona: persona || null }),
  });

export const checkHealth = () => request("/api/health");

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/document`, { method: "POST", body: formData });
  } catch (err) {
    throw new Error(
      "Can't reach the backend. Make sure your FastAPI server is running (uvicorn main:app --reload)."
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || "Upload failed.");
  }
  return res.json();
}