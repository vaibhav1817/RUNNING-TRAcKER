// pace = minutes per km
export function calculatePace(timeInSeconds, distanceInKm) {
  if (distanceInKm === 0) return "0:00";

  const paceSeconds = timeInSeconds / distanceInKm;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.floor(paceSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

// calories estimation (simple demo logic)
export function calculateCalories(distanceInKm) {
  const CAL_PER_KM = 60; // demo value
  return Math.round(distanceInKm * CAL_PER_KM);
}
