import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

async function pickFrom(source: "camera" | "library"): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8, allowsEditing: true, aspect: [1, 1] });

  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

// Picks a photo (camera or library), uploads it to the shared `uploads` Storage bucket under the
// signed-in user's own folder (required by storage RLS — see 20260820150000_add_photo_uploads.sql
// grants insert only under `${auth.uid()}/...`), and returns its public URL. Returns null if the
// user cancels, denies permission, or the upload itself fails.
export async function pickAndUploadPhoto(
  source: "camera" | "library",
  userId: string,
  folder: string
): Promise<string | null> {
  const asset = await pickFrom(source);
  if (!asset) return null;

  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const ext = asset.uri.split(".").pop()?.split("?")[0]?.toLowerCase() || "jpg";
  const path = `${userId}/${folder}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("uploads").upload(path, blob, {
    contentType: asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`,
    upsert: false,
  });
  if (error) {
    console.error("[uploadPhoto] upload failed:", error.message);
    return null;
  }

  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}
