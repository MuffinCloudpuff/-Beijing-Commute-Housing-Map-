export const formatDuration = (seconds: number) => {
  if (seconds === -1) return "已排除";
  const min = Math.ceil(seconds / 60);
  if (min < 60) return `${min} 分钟`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}小时 ${m}分钟`;
};

export const formatDistance = (meters: number) => {
  if (meters === -1) return "不在计算内";
  if (meters < 1000) return `${meters} 米`;
  return `${(meters / 1000).toFixed(1)} 千米`;
};
