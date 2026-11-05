import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export type ExpenseProofMime = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PickedExpenseProof {
  uri: string;
  mimeType: ExpenseProofMime;
}

function normalizeMime(raw: string | undefined | null, uri: string): ExpenseProofMime {
  if (raw === 'image/png' || raw === 'image/webp' || raw === 'image/jpeg') return raw;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function fromAsset(asset: ImagePicker.ImagePickerAsset): PickedExpenseProof | null {
  if (!asset.uri) return null;
  return {
    uri: asset.uri,
    mimeType: normalizeMime(asset.mimeType ?? undefined, asset.uri),
  };
}

async function pickFrom(
  launch: () => Promise<ImagePicker.ImagePickerResult>,
): Promise<PickedExpenseProof | null> {
  const result = await launch();
  if (result.canceled || !result.assets[0]) return null;
  return fromAsset(result.assets[0]);
}

export async function pickExpenseProofFromLibrary(): Promise<PickedExpenseProof | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;
  return pickFrom(() =>
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    }),
  );
}

export async function pickExpenseProofFromCamera(): Promise<PickedExpenseProof | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;
  return pickFrom(() =>
    ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    }),
  );
}

export async function uriToBase64(uri: string): Promise<string> {
  const file = new File(uri);
  return file.base64();
}
