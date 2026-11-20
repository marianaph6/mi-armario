import imageCompression from 'browser-image-compression'

/** Reduce la foto para guardarla en el celular: una versión grande y una miniatura para la cuadrícula. */
export async function prepararFoto(archivo: File): Promise<{ foto: Blob; miniatura: Blob }> {
  const base = { useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.8 }
  const foto = await imageCompression(archivo, { ...base, maxWidthOrHeight: 1200, maxSizeMB: 0.25 })
  const miniatura = await imageCompression(foto, { ...base, maxWidthOrHeight: 400, maxSizeMB: 0.04 })
  return { foto, miniatura }
}
