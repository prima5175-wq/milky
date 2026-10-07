// 브라우저에서 그림 사진을 줄여서(최대 1024px, JPEG) 올린다. 서버 용량 제한(700KB)을 넘지 않게 한다.
export async function resizeToDataUrl(file: File, maxSide = 1024, quality = 0.8): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", quality);
}
