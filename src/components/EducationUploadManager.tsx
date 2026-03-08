import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

interface EducationUpload {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_path: string;
  file_size: number | null;
  created_at: string;
}

const CATEGORIES = ["Basics", "Nutrition", "Exercise", "Monitoring", "Prevention", "Medication", "General"];

export const EducationUploadManager = () => {
  const [uploads, setUploads] = useState<EducationUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const loadUploads = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("education_uploads")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setUploads(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadUploads(); }, [loadUploads]);

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({ variant: "destructive", title: "Missing fields", description: "Title and file are required" });
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Only PDF files are allowed" });
      return;
    }

    setUploading(true);
    try {
      const filePath = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: storageError } = await supabase.storage
        .from("education-resources")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (storageError) throw storageError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: dbError } = await supabase.from("education_uploads").insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        file_path: filePath,
        file_size: file.size,
        uploaded_by: user.id,
      });
      if (dbError) throw dbError;

      toast({ title: "Uploaded", description: `${title} has been added to the Education Hub` });
      setTitle("");
      setDescription("");
      setCategory("General");
      setFile(null);
      loadUploads();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (upload: EducationUpload) => {
    try {
      await supabase.storage.from("education-resources").remove([upload.file_path]);
      const { error } = await supabase.from("education_uploads").delete().eq("id", upload.id);
      if (error) throw error;
      toast({ title: "Deleted", description: `${upload.title} has been removed` });
      loadUploads();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Education Resource
          </CardTitle>
          <CardDescription>Upload PDF documents for patients to access in the Education Hub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diabetes Self-Care Guide" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the resource..." rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">PDF File *</Label>
            <Input id="file" type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()}>
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload PDF</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Resources ({uploads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : uploads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No resources uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div key={upload.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium">{upload.title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">{upload.category}</Badge>
                        <span>{formatSize(upload.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(upload.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(upload)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
