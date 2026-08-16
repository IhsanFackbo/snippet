import crypto from "node:crypto";
import { cookies } from "next/headers";
export type SessionUser={id:number;username:string;role:string;verified:boolean};
const secret=()=>process.env.SESSION_SECRET||"change-me-in-production";
const b64=(v:string)=>Buffer.from(v).toString("base64url");
export async function signSession(user:SessionUser){const payload={...user,exp:Date.now()+30*24*60*60*1000};const body=b64(JSON.stringify(payload));const sig=crypto.createHmac("sha256",secret()).update(body).digest("base64url");return `${body}.${sig}`}
export async function getSession():Promise<SessionUser|null>{const token=(await cookies()).get("session")?.value;if(!token)return null;const [body,sig]=token.split('.');if(!body||!sig)return null;const expected=crypto.createHmac("sha256",secret()).update(body).digest("base64url");if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;try{const p=JSON.parse(Buffer.from(body,"base64url").toString());if(p.exp<Date.now())return null;return p}catch{return null}}
export async function requireSession(){const s=await getSession();if(!s)throw new Error("UNAUTHORIZED");return s}
export function sessionCookie(token:string){return{name:"session",value:token,httpOnly:true,sameSite:"lax" as const,secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*24*30}}
