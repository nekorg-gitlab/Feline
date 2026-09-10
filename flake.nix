{
  description = "Feline (Matrix client) development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { self, nixpkgs, fenix }:
    let
      # Note: x86_64-darwin (Intel Macs) is intentionally omitted because
      # upstream nixpkgs unstable dropped it. Intel Macs, Windows, and
      # non-Nix distros keep using the plain npm workflow (npm ci / npm start),
      # which is unchanged — this flake is purely additive and optional.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "aarch64-darwin"
      ];
      forEachSystem = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forEachSystem (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
          isLinux = pkgs.stdenv.hostPlatform.isLinux;

          # Web (Vite/React/TS) + Tauri toolchain shared by all platforms.
          # JS deps themselves come from npm (package-lock.json), so Nix only
          # provides the runtimes/compilers. Tauri's JS CLI (@tauri-apps/cli)
          # is also installed via npm, not via Nix.
          commonNative = with pkgs; [
            nodejs_26 # pinned via flake.lock; matches .node-version (26.8.1)
            rustc
            cargo
            rustfmt
            clippy
            rust-analyzer
            pkg-config
            git
            android-tools # adb
          ];

          # Tauri v2 Linux system libs (WebKitGTK stack + tray + bundler deps).
          # Not needed on macOS (system WebKit/Xcode) or Windows, hence Linux-only.
          linuxLibs = with pkgs; [
            webkitgtk_4_1
            gtk3
            libsoup_3
            cairo
            pango
            harfbuzz
            atk
            gdk-pixbuf
            glib
            glib-networking
            shared-mime-info
            gsettings-desktop-schemas
            librsvg
            libayatana-appindicator
            libxkbcommon
            openssl
            dbus
            xdotool
            file
          ];

          # Android SDK (platform 36 = compileSdk/targetSdk, build-tools,
          # NDK r28). Versions must exist in nixpkgs' androidenv repo.json.
          pkgsAndroid = import nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };
          androidSdk = (pkgsAndroid.androidenv.composeAndroidPackages {
            platformToolsVersion = "37.0.1";
            buildToolsVersions = [ "35.0.0" "36.1.0" ];
            platformVersions = [ "36" ];
            cmdLineToolsVersion = "latest";
            includeNDK = true;
            ndkVersions = [ "28.2.13676358" ];
          }).androidsdk;
          androidNdkVersion = "28.2.13676358";

          # Rust with Android targets (nixpkgs rustc ships host targets only).
          androidRust = fenix.packages.${system}.combine [
            fenix.packages.${system}.stable.toolchain
            fenix.packages.${system}.stable.rustfmt
            fenix.packages.${system}.stable.clippy
            fenix.packages.${system}.stable.rust-src
            fenix.packages.${system}.stable.rust-analyzer
            fenix.packages.${system}.targets.aarch64-linux-android.stable.rust-std
            fenix.packages.${system}.targets.armv7-linux-androideabi.stable.rust-std
            fenix.packages.${system}.targets.x86_64-linux-android.stable.rust-std
            fenix.packages.${system}.targets.i686-linux-android.stable.rust-std
          ];
        in
        {
          default = pkgs.mkShell {
            nativeBuildInputs = commonNative;
            buildInputs = if isLinux then linuxLibs else [ pkgs.openssl ];

            shellHook =
              ''
                echo "Feline dev shell: node $(node --version 2>/dev/null), npm $(npm --version 2>/dev/null), rustc $(rustc --version 2>/dev/null)"
                echo "Run 'npm ci' then 'npm start' (web) or 'npm run tauri:dev' (desktop)."
              ''
              + pkgs.lib.optionalString isLinux ''
                export WEBKIT_DISABLE_DMABUF_RENDERER=1
                export GIO_MODULE_DIR="${pkgs.glib-networking}/lib/gio/modules/"
                export GSETTINGS_SCHEMA_DIR="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}/glib-2.0/schemas:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}/glib-2.0/schemas"
                export XDG_DATA_DIRS="${pkgs.gsettings-desktop-schemas}/share/gsettings-schemas/${pkgs.gsettings-desktop-schemas.name}:${pkgs.gtk3}/share/gsettings-schemas/${pkgs.gtk3.name}:$XDG_DATA_DIRS"
              '';
          };

          # Full Android toolchain: `nix develop .#android` (or `direnv` variant).
          # Provides JDK + SDK/NDK + Rust Android targets for
          # `npm run tauri:android:dev` / `npm run tauri:android:build`.
          android = pkgs.mkShell {
            nativeBuildInputs = with pkgs; [
              nodejs_26
              jdk17
              androidSdk
              androidRust
              pkg-config
              openssl
              git
              android-tools # adb, fastboot
            ];

            shellHook = ''
              export JAVA_HOME="${pkgs.jdk17}"
              export ANDROID_HOME="${androidSdk}/libexec/android-sdk"
              export ANDROID_SDK_ROOT="$ANDROID_HOME"
              export NDK_HOME="$ANDROID_HOME/ndk/${androidNdkVersion}"
              export ANDROID_NDK_HOME="$NDK_HOME"
              export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"
              echo "Feline android shell: java $(java -version 2>&1 | head -n 1), rustc $(rustc --version 2>/dev/null)"
              echo "SDK: $ANDROID_HOME | NDK: $NDK_HOME"
              echo "Run 'npm run tauri:android:dev' (install+run on device) or 'npm run tauri:android:build'."
            '';
          };
        }
      );
    };
}
