import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { TEMP_ADMIN } from "@/domain/access/temp-admin";

/**
 * Cria o usuário admin temporário se ainda não existir; senão entra com ele.
 * Perfil ADMIN em factory_users é garantido pelo FactoryRoleProvider.
 */
export async function ensureTempAdminSession(
  auth: Auth,
): Promise<UserCredential> {
  if (auth.currentUser?.isAnonymous) {
    await signOut(auth);
  }

  try {
    return await createUserWithEmailAndPassword(
      auth,
      TEMP_ADMIN.email,
      TEMP_ADMIN.password,
    );
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";

    if (
      code === "auth/email-already-in-use" ||
      code === "auth/email-already-exists"
    ) {
      return signInWithEmailAndPassword(
        auth,
        TEMP_ADMIN.email,
        TEMP_ADMIN.password,
      );
    }

    throw err;
  }
}
