// The showcase's back office: every work on the shelf is entered and corrected here by hand, because
// award directories, 小红书 and 公众号 cannot be collected automatically. Each change carries a reason
// into the audit log, and the link back to where the work was seen is kept on the public page.
import { useState } from "react";
import { Form, useLoaderData, useSearchParams } from "react-router";
import { SITE } from "@design-space/site";
import { beijingDate } from "@design-space/contracts/time";
import { useAdminAction } from "@design-space/web/features/admin/action";
import { bj } from "@design-space/web/features/admin/format";
import {
  AdminPage, Badge, Button, ButtonLink, Card, DataTable, Field, FilterChips, Input, Pager, ReasonDialog, Select, Stat, Textarea,
} from "@design-space/web/features/admin/ui";
import { adminPageGet, GRAY_HEADERS } from "@design-space/web/lib/admin.server";
import { scrollBehavior } from "@design-space/web/lib/motion";
import { IconExternal } from "@design-space/web/components/icons";
import { WORK_CATEGORIES, isWorkCategory, type AdminWork, type AdminWorksResponse, type WorkCategory } from "../contracts.ts";

export const headers = () => ({ ...GRAY_HEADERS, "X-Robots-Tag": "noindex, nofollow" });
export const meta = () => [{ title: `作品收录 · ${SITE.name} 后台` }, { name: "robots", content: "noindex, nofollow" }];

export async function loader({ request }: { request: Request }) {
  const sp = new URL(request.url).searchParams;
  const state = sp.get("visible");
  const visible = state === "visible" || state === "hidden" ? state : "all";
  const category = isWorkCategory(sp.get("category")) ? sp.get("category") : null;
  const q = sp.get("q")?.trim().slice(0, 60) || null;
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);
  const params = new URLSearchParams({ visible, page: String(page) });
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  return adminPageGet<AdminWorksResponse>(request, `/api/admin/showcase/works?${params}`);
}

/** The form as the editor holds it: everything is text until it is posted. */
interface Draft {
  title: string;
  designer: string;
  category: WorkCategory;
  award: string;
  year: string;
  source_name: string;
  url: string;
  video_url: string;
  image_url: string;
  summary: string;
  published_at: string;
  visible: boolean;
}

const blank: Draft = {
  title: "", designer: "", category: "产品", award: "", year: String(new Date().getFullYear()),
  source_name: "", url: "", video_url: "", image_url: "", summary: "", published_at: "", visible: true,
};

const draftOf = (w: AdminWork): Draft => ({
  title: w.title,
  designer: w.designer ?? "",
  category: w.category,
  award: w.award ?? "",
  year: w.year === null ? "" : String(w.year),
  source_name: w.source_name,
  url: w.url,
  video_url: w.video_url ?? "",
  image_url: w.image_url ?? "",
  summary: w.summary ?? "",
  published_at: w.published_at ? beijingDate(w.published_at) : "",
  visible: w.visible,
});

const payloadOf = (d: Draft) => ({
  title: d.title,
  designer: d.designer || null,
  category: d.category,
  award: d.award || null,
  year: d.year === "" ? null : Number(d.year),
  source_name: d.source_name,
  url: d.url,
  video_url: d.video_url || null,
  image_url: d.image_url || null,
  summary: d.summary || null,
  published_at: d.published_at ? `${d.published_at}T00:00:00+08:00` : null,
  visible: d.visible,
});

export default function ShowcaseAdmin() {
  const data = useLoaderData<typeof loader>();
  const [sp] = useSearchParams();
  const { run, busy } = useAdminAction();
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "delete" | "hide" | "show"; row: AdminWork } | null>(null);

  const q = sp.get("q") ?? "";
  const visible = sp.get("visible") ?? "all";
  const category = sp.get("category") ?? "";
  const set = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  const save = async () => {
    if (!editing) return;
    const body = { ...payloadOf(editing.draft), reason: reason.trim() || null };
    const saved = editing.id
      ? await run<AdminWork>("PATCH", `/api/admin/showcase/works/${encodeURIComponent(editing.id)}`, body, { success: "已保存", label: `work-save-${editing.id}` })
      : await run<AdminWork>("POST", "/api/admin/showcase/works", body, { success: "已收录", label: "work-create" });
    if (saved) {
      setEditing(null);
      setReason("");
    }
  };

  const act = async (why: string) => {
    if (!confirm) return false;
    const { kind, row } = confirm;
    const path = `/api/admin/showcase/works/${encodeURIComponent(row.id)}`;
    const done = kind === "delete"
      ? await run("DELETE", path, { reason: why }, { success: "已删除", label: `work-delete-${row.id}` })
      : await run("POST", `${path}/visibility`, { visible: kind === "show", reason: why }, { success: kind === "show" ? "已公开" : "已隐藏", label: `work-visible-${row.id}` });
    if (done && editing?.id === row.id) setEditing(null);
    return !!done;
  };

  return (
    <AdminPage
      title="作品收录"
      subtitle="iF、红点、A' Design Award、设计竞赛与数英的获奖作品，以及小红书、公众号里值得收录的设计。手工填写，每条都留原文链接；影像类填视频链接。"
      actions={
        <>
          <ButtonLink to="/works" size="md">看公开页</ButtonLink>
          <Button tone="primary" onClick={() => { setEditing({ id: null, draft: { ...blank } }); setReason(""); }}>收录新作品</Button>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="当前筛选" value={data.total} hint={`共 ${data.visible + data.hidden} 条`} />
        <Stat label="公开" value={data.visible} tone="ok" />
        <Stat label="隐藏" value={data.hidden} tone={data.hidden ? "warn" : undefined} />
        <Stat label="含视频" value={data.withVideo} />
      </div>

      {editing && (
        <Card
          className="mb-5"
          title={editing.id ? `编辑：${editing.draft.title || editing.id}` : "收录新作品"}
          right={editing.id ? <span className="num">{editing.id}</span> : <span>链接决定 ID，同一条链接只能收录一次</span>}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="标题">
              <Input value={editing.draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="作品名，照来源页面写" maxLength={200} />
            </Field>
            <Field label="设计方" hint="工作室、公司或博主名，可留空">
              <Input value={editing.draft.designer} onChange={(e) => set({ designer: e.target.value })} placeholder="如 Philips Experience Design" maxLength={160} />
            </Field>
            <Field label="分类">
              <Select value={editing.draft.category} onChange={(e) => set({ category: e.target.value as WorkCategory })}>
                {WORK_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="来源" hint="奖项或平台名，公开页按它筛选">
              <Input value={editing.draft.source_name} onChange={(e) => set({ source_name: e.target.value })} placeholder="如 iF Design Award / 小红书" maxLength={80} />
            </Field>
            <Field label="奖项" hint="可留空">
              <Input value={editing.draft.award} onChange={(e) => set({ award: e.target.value })} placeholder="如 iF Gold Award 2026" maxLength={160} />
            </Field>
            <Field label="年份">
              <Input value={editing.draft.year} onChange={(e) => set({ year: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} inputMode="numeric" placeholder="2026" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="原文链接" hint="必填。读者点“查看原文”去这里，完整内容以来源为准">
                <Input value={editing.draft.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" inputMode="url" />
              </Field>
            </div>
            <Field label="视频链接" hint="填了就在卡片上标“视频”，详情页多一个按钮">
              <Input value={editing.draft.video_url} onChange={(e) => set({ video_url: e.target.value })} placeholder="https://www.bilibili.com/video/BV…" inputMode="url" />
            </Field>
            <Field label="封面图链接" hint="直接填图片地址，站内经图片代理显示">
              <Input value={editing.draft.image_url} onChange={(e) => set({ image_url: e.target.value })} placeholder="https://…/cover.jpg" inputMode="url" />
            </Field>
            <Field label="发布日期" hint="可留空；留空时按年份排序">
              <Input type="date" value={editing.draft.published_at} onChange={(e) => set({ published_at: e.target.value })} />
            </Field>
            <Field label="简介" hint="两三句话，照来源写，不要替来源下结论">
              <Textarea value={editing.draft.summary} onChange={(e) => set({ summary: e.target.value })} rows={3} maxLength={2000} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="备注（写进审计记录）">
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="为什么收录或改这一条" maxLength={500} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
              <input type="checkbox" checked={editing.draft.visible} onChange={(e) => set({ visible: e.target.checked })} className="size-4 accent-[var(--color-accent)]" />
              公开显示（取消勾选只留在后台）
            </label>
            <div className="flex gap-2">
              <Button tone="ghost" onClick={() => { setEditing(null); setReason(""); }}>取消</Button>
              <Button tone="primary" busy={busy} onClick={save} disabled={!editing.draft.title.trim() || !editing.draft.url.trim() || !editing.draft.source_name.trim()}>
                {editing.id ? "保存改动" : "收录"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card
        pad={false}
        title="作品列表"
        right={<span className="num">第 {data.page} 页 · 每页 50 条</span>}
      >
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <FilterChips param="visible" options={[{ value: "", label: "全部" }, { value: "visible", label: "公开" }, { value: "hidden", label: "隐藏" }]} />
            <FilterChips param="category" options={[{ value: "", label: "全部分类" }, ...data.categories.map((c) => ({ value: c.key, label: c.key, count: c.count }))]} />
          </div>
          <Form method="get" className="flex max-w-xl gap-2">
            <input type="hidden" name="visible" value={visible} />
            {category && <input type="hidden" name="category" value={category} />}
            <Input name="q" defaultValue={q} placeholder="标题、设计方、来源或链接关键词" aria-label="搜索作品" />
            <Button type="submit" tone="primary">查找</Button>
            {q && <ButtonLink to={`?${new URLSearchParams({ ...(visible !== "all" ? { visible } : {}), ...(category ? { category } : {}) })}`} size="md">清除</ButtonLink>}
          </Form>
        </div>
        <DataTable
          rows={data.rows}
          rowKey={(r) => r.id}
          empty={q || category || visible !== "all" ? "这个筛选下没有作品。" : "还没有收录作品。点右上角“收录新作品”，把奖项页面或博主的链接填进来。"}
          columns={[
            {
              key: "work",
              label: "作品",
              className: "min-w-[260px]",
              render: (r) => (
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="line-clamp-2 font-medium text-ink">{r.title}</span>
                    {!r.visible && <Badge tone="warn">隐藏</Badge>}
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[12px] text-ink-4">{r.designer ?? "—"}</div>
                </div>
              ),
            },
            { key: "category", label: "分类", render: (r) => <Badge tone="accent">{r.category}</Badge> },
            {
              key: "source",
              label: "来源 / 奖项",
              className: "min-w-[160px]",
              render: (r) => (
                <div className="min-w-0">
                  <div className="line-clamp-1 text-ink-2">{r.source_name}</div>
                  <div className="line-clamp-1 text-[12px] text-ink-4">{r.award ?? "—"}{r.year !== null ? ` · ${r.year}` : ""}</div>
                </div>
              ),
            },
            {
              key: "links",
              label: "链接",
              render: (r) => (
                <div className="flex flex-col gap-0.5 text-[12.5px]">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">原文 <IconExternal size={12} /></a>
                  {r.video_url && <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-hot hover:underline">视频 <IconExternal size={12} /></a>}
                  {!r.image_url && <span className="text-ink-4">无封面</span>}
                </div>
              ),
            },
            { key: "updated", label: "更新", render: (r) => <span className="num whitespace-nowrap text-[12px] text-ink-4">{bj(r.updated_at)}</span> },
            {
              key: "actions",
              label: "操作",
              align: "right",
              render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" onClick={() => { setEditing({ id: r.id, draft: draftOf(r) }); setReason(""); window.scrollTo({ top: 0, behavior: scrollBehavior() }); }}>编辑</Button>
                  <Button size="sm" tone="ghost" onClick={() => setConfirm({ kind: r.visible ? "hide" : "show", row: r })}>{r.visible ? "隐藏" : "公开"}</Button>
                  <Button size="sm" tone="ghost" className="text-hot" onClick={() => setConfirm({ kind: "delete", row: r })}>删除</Button>
                </div>
              ),
            },
          ]}
        />
        <div className="px-4 pb-4">
          <Pager page={data.page} hasMore={data.page * 50 < data.total} />
        </div>
      </Card>

      <ReasonDialog
        open={confirm !== null}
        title={confirm?.kind === "delete" ? "删除这条作品" : confirm?.kind === "hide" ? "隐藏这条作品" : "公开这条作品"}
        description={confirm ? `《${confirm.row.title}》${confirm.kind === "delete" ? "会从公开页和后台一并删掉，审计记录里仍留有删除前的内容。" : confirm.kind === "hide" ? "会从公开页撤下，后台仍能看到和改。" : "会重新出现在公开页。"}` : undefined}
        confirmLabel={confirm?.kind === "delete" ? "删除" : "确认"}
        danger={confirm?.kind === "delete"}
        busy={busy}
        onClose={() => setConfirm(null)}
        onSubmit={act}
      />
    </AdminPage>
  );
}