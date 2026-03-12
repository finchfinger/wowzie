/**
 * new/page.tsx — Next.js route entry point.
 * The real component lives in _form.tsx so it can be imported without
 * going through a Next.js page-entry bundle (which causes React hook
 * errors when dynamically re-imported from edit/page.tsx).
 */
export { default } from "./_form";
