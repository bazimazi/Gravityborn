import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

let pending = false;
/** Native WebViews export through the OS share sheet; browsers keep ordinary downloads. */
export async function exportJson(
  filename: string,
  data: string,
): Promise<'exported' | 'cancelled'> {
  if (!/^gravityborn-(save|run|diagnostics)\.json$/.test(filename))
    throw new Error('Invalid export name');
  if (pending) throw new Error('An export is already open');
  pending = true;
  try {
    if (Capacitor.isNativePlatform()) {
      const file = await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      // Keep the latest file of each kind: another app may read it after the chooser returns.
      await Share.share({
        title: 'Gravityborn export',
        dialogTitle: 'Save or share Gravityborn file',
        files: [file.uri],
      });
    } else {
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return 'exported';
  } catch (error) {
    if (error instanceof Error && /cancel|dismiss/i.test(error.message)) return 'cancelled';
    throw error;
  } finally {
    pending = false;
  }
}
