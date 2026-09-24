export interface PendingAttachment {
  name: string;
  url: string; // base64 data URL
  size: number;
  type: string;
}

export function fileToAttachment(file: File): Promise<PendingAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        url: reader.result as string, // data:image/png;base64,....
        size: file.size,
        type: file.type,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}