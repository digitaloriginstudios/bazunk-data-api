/** Parse only known Amazon product URLs; never fetch arbitrary user URLs. */
export function amazonAsin(input:string):string|null {
  const text=input.trim();
  if(/^[A-Z0-9]{10}$/i.test(text)) return text.toUpperCase();
  let url:URL;
  try { url=new URL(text); } catch { return null; }
  if(url.protocol!=="https:" || url.username || url.password || url.port) return null;
  if(!/^(?:www\.|smile\.|m\.)?amazon\.(?:co\.uk|com|de|fr|it|es|ca|com\.au|co\.jp)$/i.test(url.hostname)) return null;
  const match=url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);
  return match?match[1].toUpperCase():null;
}
