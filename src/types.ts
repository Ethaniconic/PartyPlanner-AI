export interface User {
  id: number;
  email: string;
  name: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
}

export interface FoodLog {
  id: number;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image_url: string;
  created_at: string;
}

export interface Stats {
  current: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
  };
  goals: {
    calorie_goal: number;
    protein_goal: number;
    carbs_goal: number;
    fat_goal: number;
  };
}
