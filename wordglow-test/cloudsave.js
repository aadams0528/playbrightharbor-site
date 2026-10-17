// Bright Harbor cloud save, shared by all our games (plan: business/cloud-save-plan.md).
// A player can sign in (Apple on iPhone, Google on Android) to keep their progress through
// app updates and on a new phone. Playing never needs an account.
//
// Each game provides, before calling BHCloud.init():
//   window.BH_SAVE = {
//     game: "wordglow",        // Firestore doc id under saves/{uid}/games/
//     version: 1,              // bump when the save shape changes
//     get(),                   // returns the save object to upload
//     merge(cloud, version),   // merges the cloud copy (or null) into the phone's save,
//                              //   writes the result locally and returns it
//   }
// and calls BHCloud.changed() whenever it saves. Uses the Capacitor Firebase plugins
// @capacitor-firebase/authentication and @capacitor-firebase/firestore; in a browser it stays off.
window.BHCloud = (() => {
  const cap = window.Capacitor;
  const Auth = cap?.Plugins?.FirebaseAuthentication;
  const Store = cap?.Plugins?.FirebaseFirestore;
  const platform = cap?.getPlatform?.() || "web";
  const available = !!(cap?.isNativePlatform?.() && Auth && Store);
  // Sign in with Apple needs the Apple Developer account; switch on once it's set up.
  const config = { appleReady: false, delayMs: 5000 };
  let user = null, timer = null, listeners = [];

  const hook = () => window.BH_SAVE;
  const docRef = () => `saves/${user.uid}/games/${hook().game}`;
  const emit = () => listeners.forEach(f => { try { f(user); } catch {} });
  // iPhone uses Apple (Apple requires it when any other sign-in is offered); Android uses Google.
  const provider = () => platform === "ios" ? (config.appleReady ? "apple" : null) : platform === "android" ? "google" : null;

  async function upload(data) {
    await Store.setDocument({
      reference: docRef(),
      // Stored as a JSON string: Firestore can't hold nested arrays like a game board.
      data: { v: hook().version, data: JSON.stringify(data), updatedAt: Date.now(), platform },
    });
  }
  // Fetch the cloud copy, merge it with the phone's save, then upload the result.
  async function sync() {
    const { snapshot } = await Store.getDocument({ reference: docRef() });
    let cloud = null, v = null;
    if (snapshot?.data?.data) { try { cloud = JSON.parse(snapshot.data.data); v = snapshot.data.v; } catch {} }
    const merged = hook().merge(cloud, v);
    await upload(merged);
    return { restored: !!cloud };
  }

  return {
    get available() { return available && !!provider(); },
    get user() { return user; },
    get provider() { return provider(); },
    config,
    onChange(f) { listeners.push(f); },
    // On launch: pick up a sign-in from an earlier session and sync quietly.
    async init() {
      if (!available) return;
      try {
        ({ user } = await Auth.getCurrentUser());
        emit();
        if (user) await sync();
      } catch (e) { console.warn("Cloud save unavailable", e); }
    },
    async signIn() {
      const p = provider();
      if (!p) throw new Error("Sign-in isn't available on this device yet");
      ({ user } = p === "apple" ? await Auth.signInWithApple() : await Auth.signInWithGoogle());
      emit();
      return sync();
    },
    async signOut() {
      clearTimeout(timer);
      await Auth.signOut();
      user = null; emit();
    },
    // Upload a few seconds after the last save, so a burst of saves sends once.
    changed() {
      if (!user) return;
      clearTimeout(timer);
      timer = setTimeout(() => upload(hook().get()).catch(e => console.warn("Cloud upload failed", e)), config.delayMs);
    },
    // Send any waiting upload now (when the app goes to the background).
    async flush() {
      if (!user || !timer) return;
      clearTimeout(timer); timer = null;
      await upload(hook().get()).catch(() => {});
    },
  };
})();
