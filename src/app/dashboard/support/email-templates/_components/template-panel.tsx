"use client";

import { useRef, useState } from "react";
import { Mail, Save, Send, Tag } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateEmailTemplate } from "@/lib/email-templates-store";
import type { EmailTemplate } from "@/types/email-templates";
import {
  fillSubject,
  renderBodyPreview,
  toEditorHtml,
} from "./email-template-utils";
import { TemplateEditor, type TemplateEditorHandle } from "./template-editor";

export function TemplatePanel({ template }: { template: EmailTemplate }) {
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);
  const [testEmail, setTestEmail] = useState("");
  const editorRef = useRef<TemplateEditorHandle>(null);

  const dirty = subject !== template.subject || body !== template.body;

  function save() {
    updateEmailTemplate(template.id, { subject, body });
    toast.success("Template saved");
  }

  function insertTag(tag: string) {
    // The editor's insert() calls onChange (setBody) with the updated HTML.
    editorRef.current?.insert(`{{${tag}}}`);
  }

  function sendTest() {
    const to = testEmail.trim();
    if (!to) {
      toast.error("Enter an email address to send a test.");
      return;
    }
    toast.success(`Test email sent to ${to}`);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Mail className="text-muted-foreground size-4" />
            {template.name}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              Trigger: {template.trigger}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              To: {template.recipient}
            </Badge>
          </div>
        </div>
        <Button
          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={!dirty}
          onClick={save}
        >
          <Save className="size-4" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="edit" className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-3">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </div>

        {/* Edit */}
        <TabsContent
          value="edit"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-subject">Subject Line</Label>
            <Input
              id="tmpl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Tag className="size-3.5" />
              Merge Tags
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {template.mergeTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertTag(tag)}
                  className="bg-muted/60 hover:bg-muted rounded-full border px-2 py-0.5 font-mono text-xs transition-colors"
                  title="Insert into the body at the cursor"
                >
                  {`{{${tag}}}`}
                </button>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">
              Click a tag to insert it into the body at your cursor.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Body</Label>
            <TemplateEditor
              ref={editorRef}
              initialValue={toEditorHtml(template.body)}
              onChange={setBody}
            />
          </div>
        </TabsContent>

        {/* Preview */}
        <TabsContent
          value="preview"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
        >
          <div className="overflow-hidden rounded-xl border">
            <div className="bg-muted/40 border-b px-4 py-3">
              <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
                Subject
              </p>
              <p className="text-sm font-semibold">{fillSubject(subject)}</p>
            </div>
            <div
              className="text-foreground/90 [&_a]:text-primary space-y-2 p-4 text-sm/relaxed [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: renderBodyPreview(body) }}
            />
          </div>

          <div className="bg-muted/30 flex flex-wrap items-end gap-2 rounded-xl border p-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="test-email" className="text-sm">
                Send a test email
              </Label>
              <Input
                id="test-email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="you@yipyy.com"
                className="max-w-xs"
              />
            </div>
            <Button variant="outline" className="gap-2" onClick={sendTest}>
              <Send className="size-4" />
              Send Test Email
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Preview shows sample data substituted for merge tags.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
