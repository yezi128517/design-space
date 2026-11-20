// What the showcase's api answers and its pages draw. The categories are the design disciplines the
// gallery filters by; a work's own source names it, and the link back to it is always shown.
export const WORK_CATEGORIES = ["产品", "交互", "平面", "空间", "服务", "影像"] as const;
export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export const isWorkCategory = (value: unknown): value is WorkCategory =>
  typeof value === "string" && (WORK_CATEGORIES as readonly string[]).includes(value);

export interface WorkPicture {
  url: string;
  srcSet?: string;
}

/** A work as the gallery draws it: enough to judge it from the card, nothing else. */
export interface WorkCard {
  id: string;
  title: string;
  designer: string | null;
  category: WorkCategory;
  award: string | null;
  year: number | null;
  sourceName: string;
  picture: WorkPicture | null;
  hasVideo: boolean;
}

export interface WorkDetail extends WorkCard {
  url: string;
  videoUrl: string | null;
  summary: string | null;
  publishedAt: string | null;
}

export interface WorksResponse {
  works: WorkCard[];
  total: number;
  page: number;
  pageSize: number;
  category: WorkCategory | null;
  source: string | null;
  q: string | null;
  categories: Array<{ key: WorkCategory; count: number }>;
  sources: Array<{ name: string; count: number }>;
}

export interface WorkResponse {
  work: WorkDetail;
  related: WorkCard[];
}

/** A row as the back office edits it: the stored fields, including the ones the public page leaves out. */
export interface AdminWork {
  id: string;
  title: string;
  designer: string | null;
  category: WorkCategory;
  award: string | null;
  year: number | null;
  source_name: string;
  url: string;
  video_url: string | null;
  image_url: string | null;
  summary: string | null;
  published_at: string | null;
  visible: boolean;
  updated_at: string;
}

export interface AdminWorksResponse {
  rows: AdminWork[];
  total: number;
  page: number;
  visible: number;
  hidden: number;
  withVideo: number;
  categories: Array<{ key: WorkCategory; count: number }>;
}

/** What the back office writes; every field but the title, category, source and link may be left out. */
export interface WorkInput {
  title: string;
  designer?: string | null;
  category: WorkCategory;
  award?: string | null;
  year?: number | null;
  source_name: string;
  url: string;
  video_url?: string | null;
  image_url?: string | null;
  summary?: string | null;
  published_at?: string | null;
  visible?: boolean;
}