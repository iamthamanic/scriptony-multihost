/**
 * Creative Gym types.
 */

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty?: "easy" | "medium" | "hard";
  type?: string;
  timeLimit?: number; // in minutes
  points?: number;
  createdAt: string;
}

export interface ArtForm {
  id: string;
  name: string;
  description: string;
  category?: string;
  exercises?: Exercise[];
}

export interface Exercise {
  id: string;
  artFormId: string;
  title: string;
  description: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  duration?: number;
}

export interface TrainingPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  exercises: Exercise[];
  startDate: string;
  endDate?: string;
  progress?: number;
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon?: string;
  earnedAt: string;
}
