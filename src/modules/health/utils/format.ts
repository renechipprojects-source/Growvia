export const shortDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const bmiStatus = (bmi: number): "Underweight" | "Normal" | "Overweight" | "Obese" => {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
};

export const calcBmi = (heightCm: number, weightKg: number) => {
  const m = heightCm / 100;
  return +(weightKg / (m * m)).toFixed(1);
};
