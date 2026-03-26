import { createFileRoute, useRouter, useRouteContext } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState, useTransition, useMemo, useEffect } from 'react'
import {
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid'
import {
  HighlightedCode,
  type SyntaxLang,
} from '@/components/admin/settings/widget/highlighted-code'
import { cn } from '@/lib/shared/utils'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsCard } from '@/components/admin/settings/settings-card'
import {
  BrandingLayout,
  BrandingControlsPanel,
  BrandingPreviewPanel,
} from '@/components/admin/settings/branding/branding-layout'
import { WidgetPreview } from '@/components/admin/settings/widget/widget-preview'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { settingsQueries } from '@/lib/client/queries/settings'
import { adminQueries } from '@/lib/client/queries/admin'
import { updateWidgetConfigFn, regenerateWidgetSecretFn } from '@/lib/server/functions/settings'
import * as m from '@/paraglide/messages'

export const Route = createFileRoute('/admin/settings/widget')({
  loader: async ({ context }) => {
    const { requireWorkspaceRole } = await import('@/lib/server/functions/workspace-utils')
    await requireWorkspaceRole({ data: { allowedRoles: ['admin'] } })

    const { queryClient } = context
    await Promise.all([
      queryClient.ensureQueryData(settingsQueries.widgetConfig()),
      queryClient.ensureQueryData(settingsQueries.widgetSecret()),
      queryClient.ensureQueryData(adminQueries.boards()),
    ])

    return {}
  },
  component: WidgetSettingsPage,
})

function InlineSpinner({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
}

function WidgetSettingsPage() {
  const widgetConfigQuery = useSuspenseQuery(settingsQueries.widgetConfig())
  const widgetSecretQuery = useSuspenseQuery(settingsQueries.widgetSecret())
  const boardsQuery = useSuspenseQuery(adminQueries.boards())
  const { baseUrl } = useRouteContext({ from: '__root__' })

  const config = widgetConfigQuery.data

  // Lift appearance state so the preview can react to changes
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>(
    (config.position as 'bottom-right' | 'bottom-left') ?? 'bottom-right'
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">{m.nav_settings()}</BackLink>
      </div>
      <PageHeader
        icon={ChatBubbleLeftRightIcon}
        title={m.settings_widget_page_title()}
        description={m.settings_widget_page_description()}
      />

      <WidgetToggle initialEnabled={config.enabled} />

      {/* Appearance + Preview: two-column layout */}
      <BrandingLayout>
        <BrandingControlsPanel>
          <WidgetAppearanceControls
            config={config}
            boards={boardsQuery.data}
            position={position}
            onPositionChange={setPosition}
          />
        </BrandingControlsPanel>
        <BrandingPreviewPanel label={m.branding_preview_label()}>
          <WidgetPreview position={position} />
        </BrandingPreviewPanel>
      </BrandingLayout>

      <WidgetInstallation config={config} secret={widgetSecretQuery.data} baseUrl={baseUrl ?? ''} />
    </div>
  )
}

function WidgetToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(initialEnabled)

  async function handleToggle(checked: boolean) {
    setEnabled(checked)
    setSaving(true)
    try {
      await updateWidgetConfigFn({ data: { enabled: checked } })
      startTransition(() => router.invalidate())
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsCard
      title={m.settings_widget_card_title()}
      description={m.settings_widget_card_description()}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
          <div>
            <Label htmlFor="widget-toggle" className="text-sm font-medium cursor-pointer">
              {m.settings_widget_enable_title()}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {m.settings_widget_enable_description()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InlineSpinner visible={saving || isPending} />
            <Switch
              id="widget-toggle"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={saving || isPending}
              aria-label={m.settings_widget_page_title()}
            />
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}

function WidgetAppearanceControls({
  config,
  boards,
  position,
  onPositionChange,
}: {
  config: { defaultBoard?: string; position?: string }
  boards: { id: string; name: string; slug: string }[]
  position: 'bottom-right' | 'bottom-left'
  onPositionChange: (val: 'bottom-right' | 'bottom-left') => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [defaultBoard, setDefaultBoard] = useState(config.defaultBoard ?? '')

  async function save(updates: Record<string, unknown>) {
    setSaving(true)
    try {
      await updateWidgetConfigFn({ data: updates })
      startTransition(() => router.invalidate())
    } finally {
      setSaving(false)
    }
  }

  const isBusy = saving || isPending

  return (
    <>
      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">{m.settings_section_appearance()}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {m.settings_widget_appearance_description()}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="widget-position" className="text-xs text-muted-foreground">
            {m.settings_widget_button_position()}
          </Label>
          <Select
            value={position}
            onValueChange={(val: 'bottom-right' | 'bottom-left') => {
              onPositionChange(val)
              save({ position: val })
            }}
            disabled={isBusy}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">
                {m.settings_widget_position_bottom_right()}
              </SelectItem>
              <SelectItem value="bottom-left">
                {m.settings_widget_position_bottom_left()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            {m.settings_widget_default_board_title()}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {m.settings_widget_default_board_description()}
          </p>
        </div>

        <Select
          value={defaultBoard || '__all__'}
          onValueChange={(val) => {
            const resolved = val === '__all__' ? '' : val
            setDefaultBoard(resolved)
            save({ defaultBoard: resolved || undefined })
          }}
          disabled={isBusy}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={m.settings_widget_all_boards()} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{m.settings_widget_all_boards()}</SelectItem>
            {boards.map((board) => (
              <SelectItem key={board.id} value={board.slug}>
                {board.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}

// ==============================================
// Installation Guide — Interactive Code Panel
// ==============================================

const SERVER_EXAMPLES: {
  id: string
  label: string
  filename: string
  lang: SyntaxLang
  code: string
}[] = [
  {
    id: 'nextjs',
    label: 'Next.js',
    filename: 'route.ts',
    lang: 'js',
    code: `import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({}, { status: 401 });
  }

  const hash = crypto
    .createHmac("sha256", process.env.QUACKBACK_WIDGET_SECRET!)
    .update(session.user.id)
    .digest("hex");

  return NextResponse.json({ hash });
}`,
  },
  {
    id: 'express',
    label: 'Express',
    filename: 'widget.js',
    lang: 'js',
    code: `import crypto from "crypto";

app.post("/api/widget-hash", (req, res) => {
  // req.user set by your auth middleware
  const hash = crypto
    .createHmac("sha256", process.env.QUACKBACK_WIDGET_SECRET)
    .update(req.user.id)
    .digest("hex");

  res.json({ hash });
});`,
  },
  {
    id: 'django',
    label: 'Django',
    filename: 'views.py',
    lang: 'python',
    code: `import hmac, hashlib
from django.conf import settings
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

@login_required
def widget_hash(request):
    digest = hmac.new(
        settings.QUACKBACK_WIDGET_SECRET.encode(),
        str(request.user.id).encode(),
        hashlib.sha256,
    ).hexdigest()
    return JsonResponse({"hash": digest})`,
  },
  {
    id: 'rails',
    label: 'Rails',
    filename: 'widget_controller.rb',
    lang: 'ruby',
    code: `class Api::WidgetController < ApplicationController
  before_action :authenticate_user!

  def identify_hash
    digest = OpenSSL::HMAC.hexdigest(
      "sha256",
      ENV["QUACKBACK_WIDGET_SECRET"],
      current_user.id.to_s,
    )
    render json: { hash: digest }
  end
end`,
  },
  {
    id: 'laravel',
    label: 'Laravel',
    filename: 'WidgetController.php',
    lang: 'php',
    code: `use Illuminate\\Http\\Request;

class WidgetController extends Controller
{
    public function identifyHash(Request $request)
    {
        $hash = hash_hmac(
            "sha256",
            $request->user()->id,
            config("services.quackback.widget_secret"),
        );
        return response()->json(["hash" => $hash]);
    }
}`,
  },
]

const CLIENT_CODE_SIMPLE = `import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export function WidgetIdentify() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      Quackback("identify", {
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } else {
      Quackback("identify", { anonymous: true });
    }
  }, [user]);

  return null;
}`

const CLIENT_CODE_WITH_HMAC = `import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export function WidgetIdentify() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetch("/api/widget-hash", { method: "POST" })
        .then((res) => res.json())
        .then(({ hash }) => {
          Quackback("identify", {
            id: user.id,
            email: user.email,
            name: user.name,
            hash,
          });
        });
    } else {
      Quackback("identify", { anonymous: true });
    }
  }, [user]);

  return null;
}`

interface CodeTab {
  id: string
  label: string
  lang: SyntaxLang
  code: string
}

function WidgetInstallation({
  config,
  secret,
  baseUrl,
}: {
  config: { identifyVerification?: boolean }
  secret: string | null
  baseUrl: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  // Guide UI state
  const [framework, setFramework] = useState('nextjs')
  const [activeTab, setActiveTab] = useState('snippet')

  // Persisted state
  const [hmacEnabled, setHmacEnabled] = useState(config.identifyVerification ?? false)
  const [currentSecret, setCurrentSecret] = useState(secret)
  const [secretVisible, setSecretVisible] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const installSnippet = useMemo(
    () =>
      `<script>
  (function(w,d){if(w.Quackback)return;w.Quackback=function(){
  (w.Quackback.q=w.Quackback.q||[]).push(arguments)};
  var s=d.createElement("script");s.async=true;
  s.src="${baseUrl}/api/widget/sdk.js";
  d.head.appendChild(s)})(window,document);

  Quackback("init");
</script>`,
    [baseUrl]
  )

  // Build dynamic tabs based on options
  const tabs = useMemo<CodeTab[]>(() => {
    const t: CodeTab[] = [
      { id: 'snippet', label: 'snippet.html', lang: 'js', code: installSnippet },
    ]
    if (hmacEnabled) {
      const ex = SERVER_EXAMPLES.find((e) => e.id === framework)
      if (ex) {
        t.push({ id: 'server', label: ex.filename, lang: ex.lang, code: ex.code })
      }
    }
    t.push({
      id: 'client',
      label: 'identify.tsx',
      lang: 'js',
      code: hmacEnabled ? CLIENT_CODE_WITH_HMAC : CLIENT_CODE_SIMPLE,
    })
    return t
  }, [installSnippet, hmacEnabled, framework])

  // Reset active tab if it's no longer available
  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab('snippet')
    }
  }, [tabs, activeTab])

  const activeTabData = tabs.find((t) => t.id === activeTab) ?? tabs[0]

  async function handleHmacToggle(checked: boolean) {
    setHmacEnabled(checked)
    setSaving(true)
    try {
      await updateWidgetConfigFn({ data: { identifyVerification: checked } })
      startTransition(() => router.invalidate())
    } finally {
      setSaving(false)
    }
  }

  async function handleCopySecret() {
    if (!currentSecret) return
    await navigator.clipboard.writeText(currentSecret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(activeTabData.code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const newSecret = await regenerateWidgetSecretFn()
      setCurrentSecret(newSecret)
      startTransition(() => router.invalidate())
    } finally {
      setRegenerating(false)
    }
  }

  const maskedSecret = currentSecret
    ? currentSecret.slice(0, 8) + '\u2022'.repeat(Math.max(0, currentSecret.length - 8))
    : null

  const isBusy = saving || isPending

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-[480px]">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] flex-1">
        {/* ─── Left: Configuration ─── */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border divide-y divide-border">
          {/* Header */}
          <div className="p-5">
            <h3 className="text-sm font-semibold text-foreground">
              {m.settings_widget_installation_title()}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {m.settings_widget_installation_description()}
            </p>
          </div>

          {/* Step 1 */}
          <div className="p-5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0">
                1
              </span>
              <span className="text-xs font-medium text-foreground">
                {m.settings_widget_add_script_title()}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground ml-7">
              {m.settings_widget_add_script_description_prefix()}{' '}
              <code className="text-[11px]">&lt;/body&gt;</code>{' '}
              {m.settings_widget_add_script_description_suffix()}
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex-1 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0">
                2
              </span>
              <div>
                <span className="text-xs font-medium text-foreground">
                  {m.settings_widget_identify_users_title()}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  {m.settings_widget_identify_users_description()}
                </p>
              </div>
            </div>

            <div className="ml-7 space-y-3">
              {/* HMAC toggle */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-medium text-foreground">
                    {m.settings_widget_hmac_title()}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {m.settings_widget_hmac_description()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <InlineSpinner visible={isBusy} />
                  <Switch
                    checked={hmacEnabled}
                    onCheckedChange={handleHmacToggle}
                    disabled={isBusy}
                    aria-label={m.settings_widget_hmac_aria()}
                  />
                </div>
              </div>

              {hmacEnabled && (
                <div className="space-y-2.5">
                  {/* Framework */}
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      {m.settings_widget_backend_framework()}
                    </Label>
                    <Select value={framework} onValueChange={setFramework}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVER_EXAMPLES.map((ex) => (
                          <SelectItem key={ex.id} value={ex.id}>
                            {ex.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Secret */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">
                      {m.settings_widget_secret_label()}
                    </Label>
                    {currentSecret ? (
                      <div className="flex items-center gap-1">
                        <code className="flex-1 text-[10px] font-mono text-foreground bg-muted/30 border border-border/50 rounded px-2 py-1 truncate">
                          {secretVisible ? currentSecret : maskedSecret}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => setSecretVisible(!secretVisible)}
                        >
                          {secretVisible ? (
                            <EyeSlashIcon className="h-3 w-3" />
                          ) : (
                            <EyeIcon className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={handleCopySecret}
                        >
                          {copiedSecret ? (
                            <CheckIcon className="h-3 w-3 text-green-500" />
                          ) : (
                            <ClipboardDocumentIcon className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        {m.settings_widget_secret_empty()}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={handleRegenerate}
                      disabled={regenerating}
                    >
                      {regenerating ? (
                        <>
                          <ArrowPathIcon className="h-3 w-3 animate-spin mr-1" />
                          {m.settings_widget_regenerating()}
                        </>
                      ) : (
                        m.settings_widget_regenerate()
                      )}
                    </Button>
                  </div>

                  {/* Security note */}
                  <p className="flex items-start gap-1.5 text-[10px] text-yellow-600 dark:text-yellow-500">
                    <ExclamationTriangleIcon className="h-3 w-3 shrink-0 mt-px" />
                    {m.settings_widget_secret_warning()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Right: Dynamic Code Panel ─── */}
        <div className="flex flex-col">
          {/* File tabs */}
          <div
            className="flex items-center justify-between shrink-0 px-1"
            style={{ backgroundColor: '#252526' }}
          >
            <div className="flex items-center">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-2 text-[11px] font-mono transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'text-white/90 border-primary'
                      : 'text-white/40 border-transparent hover:text-white/60'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2.5 py-1.5 mr-1 rounded text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              {copiedCode ? (
                <>
                  <CheckIcon className="h-3 w-3 text-green-400" />
                  <span className="text-green-400">{m.common_copied()}</span>
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="h-3 w-3" />
                  <span>{m.common_copy()}</span>
                </>
              )}
            </button>
          </div>

          {/* Code display */}
          <div className="flex-1 overflow-auto">
            <HighlightedCode code={activeTabData.code} lang={activeTabData.lang} />
          </div>
        </div>
      </div>
    </div>
  )
}
