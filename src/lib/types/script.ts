/**
 * Script analysis and upload types.
 */

export interface ScriptUpload {
  id: string;
  userId: string;
  fileName: string;
  fileSize: number;
  status: "uploading" | "processing" | "completed" | "failed";
  uploadedAt: string;
  processedAt?: string;
  analysis?: ScriptAnalysis;
}

export interface ScriptAnalysis {
  characterCount: number;
  sceneCount: number;
  pageCount: number;
  wordCount: number;
  estimatedDuration: number;
  characters: Array<{
    name: string;
    dialogueCount: number;
    firstAppearance: number;
  }>;
  scenes: Array<{
    number: number;
    location: string;
    timeOfDay: string;
    pageCount: number;
  }>;
  insights?: {
    pacing?: string;
    structure?: string;
    suggestions?: string[];
  };
}
