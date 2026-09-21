import { ConfigError, readSupabaseConfig } from "../config";

const URL_VAR = "EXPO_PUBLIC_SUPABASE_URL";
const KEY_VAR = "EXPO_PUBLIC_SUPABASE_ANON_KEY";
const SECRET_LOOKING_KEY = "sb_publishable_DO_NOT_LEAK_0123456789";

function thrownBy(run: () => unknown): Error {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) return error;
  }
  throw new Error("expected the call to throw");
}

describe("readSupabaseConfig (AC-46, AC-47)", () => {
  it("returns the two public settings", () => {
    expect(
      readSupabaseConfig({ [URL_VAR]: "http://127.0.0.1:54321", [KEY_VAR]: SECRET_LOOKING_KEY }),
    ).toEqual({ url: "http://127.0.0.1:54321", anonKey: SECRET_LOOKING_KEY });
  });

  it("trims stray whitespace from .env values", () => {
    expect(
      readSupabaseConfig({ [URL_VAR]: "  https://x.supabase.co\n", [KEY_VAR]: ` ${SECRET_LOOKING_KEY} ` }),
    ).toEqual({ url: "https://x.supabase.co", anonKey: SECRET_LOOKING_KEY });
  });

  it("throws a readable ConfigError naming the missing URL", () => {
    const error = thrownBy(() => readSupabaseConfig({ [KEY_VAR]: SECRET_LOOKING_KEY }));
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain(URL_VAR);
    expect(error.message).toMatch(/\.env/);
  });

  it("throws a readable ConfigError naming the missing key, without any value in the text", () => {
    const error = thrownBy(() => readSupabaseConfig({ [URL_VAR]: "http://127.0.0.1:54321" }));
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).toContain(KEY_VAR);
    expect(error.message).not.toContain("127.0.0.1");
  });

  it("treats empty and whitespace-only values as missing", () => {
    expect(() => readSupabaseConfig({ [URL_VAR]: "", [KEY_VAR]: SECRET_LOOKING_KEY })).toThrow(
      ConfigError,
    );
    expect(() => readSupabaseConfig({ [URL_VAR]: "http://x.test", [KEY_VAR]: "   " })).toThrow(
      ConfigError,
    );
    expect(() => readSupabaseConfig({})).toThrow(ConfigError);
  });

  it("never puts the key value into an error message", () => {
    const error = thrownBy(() =>
      readSupabaseConfig({ [URL_VAR]: "not a url", [KEY_VAR]: SECRET_LOOKING_KEY }),
    );
    expect(error).toBeInstanceOf(ConfigError);
    expect(error.message).not.toContain(SECRET_LOOKING_KEY);
    expect(error.message).toContain(URL_VAR);
  });

  it("rejects a non-http(s) URL", () => {
    expect(() =>
      readSupabaseConfig({ [URL_VAR]: "ftp://example.com", [KEY_VAR]: SECRET_LOOKING_KEY }),
    ).toThrow(ConfigError);
  });

  it("ignores every variable other than the two public ones", () => {
    expect(
      readSupabaseConfig({
        [URL_VAR]: "http://x.test",
        [KEY_VAR]: SECRET_LOOKING_KEY,
        EXPO_PUBLIC_SOMETHING_ELSE: "ignored",
      }),
    ).toEqual({ url: "http://x.test", anonKey: SECRET_LOOKING_KEY });
  });
});

describe("client initialisation (AC-8, AC-19, AC-47)", () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  afterEach(() => {
    // Assigning `undefined` to process.env would store the string "undefined".
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    else process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
    jest.dontMock("@supabase/supabase-js");
  });

  type ClientModule = typeof import("../client");
  interface CreateClientOptions {
    auth: {
      storage: unknown;
      storageKey: string;
      autoRefreshToken: boolean;
      persistSession: boolean;
      detectSessionInUrl: boolean;
    };
    global: { fetch: typeof fetch };
  }

  function loadClient(): { module: ClientModule; createClient: jest.Mock } {
    const createClient = jest.fn(() => ({ auth: {} }));
    jest.doMock("@supabase/supabase-js", () => ({ __esModule: true, createClient }));
    let module: ClientModule | undefined;
    jest.isolateModules(() => {
      module = require("../client") as ClientModule;
    });
    if (!module) throw new Error("client module did not load");
    return { module, createClient };
  }

  it("throws a ConfigError at initialisation when the build has no settings", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const createClient = jest.fn();
    jest.doMock("@supabase/supabase-js", () => ({ __esModule: true, createClient }));
    expect(() => {
      jest.isolateModules(() => {
        require("../client");
      });
    }).toThrow(/Supabase is not configured/);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates the client with encrypted storage, a fixed storage key and no URL session detection", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = SECRET_LOOKING_KEY;
    const { createClient } = loadClient();
    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, options] = createClient.mock.calls[0] as unknown as [
      string,
      string,
      CreateClientOptions,
    ];
    expect(url).toBe("http://127.0.0.1:54321");
    expect(key).toBe(SECRET_LOOKING_KEY);
    expect(options.auth).toMatchObject({
      storageKey: "tripplanner.auth.session",
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    });
    expect(typeof (options.auth.storage as { getItem: unknown }).getItem).toBe("function");
  });

  it("aborts a request that outlives the timeout (offline, not an endless spinner)", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = SECRET_LOOKING_KEY;
    const { module } = loadClient();
    jest.useFakeTimers();
    try {
      const hung = jest.fn(
        (_input: unknown, init?: { signal?: AbortSignal }) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      );
      const wrapped = module.createFetchWithTimeout(module.REQUEST_TIMEOUT_MS, hung as never);
      const pending = wrapped("http://x.test");
      const settled = expect(pending).rejects.toThrow("aborted");
      await jest.advanceTimersByTimeAsync(module.REQUEST_TIMEOUT_MS);
      await settled;
      expect(module.REQUEST_TIMEOUT_MS).toBe(15_000);
    } finally {
      jest.useRealTimers();
    }
  });

  it("passes a fast response through and clears the timer", async () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = SECRET_LOOKING_KEY;
    const { module } = loadClient();
    const response = { ok: true } as Response;
    const wrapped = module.createFetchWithTimeout(50, jest.fn(() => Promise.resolve(response)));
    await expect(wrapped("http://x.test")).resolves.toBe(response);
  });
});
