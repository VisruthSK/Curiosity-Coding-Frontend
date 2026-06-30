# Curiosity Coding Interface

Vibe coded, internal coding tool for [Curiosity](https://www.visruth.com/posters/USCOTS%20Curiosity%20Poster.svg) (see us at eCOTS, ICOTS, etc. too!) student responses. Everything is, of course, done in browser--there's no backend, no data ever leaves your laptop.

## Installation

Download the latest release from the [Releases page](https://github.com/VisruthSK/Curiosity-Coding-Frontend/releases/latest).

### macOS

Pick the right `.dmg`:

* Apple Silicon: `Curiosity-Coding-Interface-macOS-Apple-Silicon.dmg`
* Intel: `Curiosity-Coding-Interface-macOS-Intel.dmg`

To check your Mac type, open Apple menu -> About This Mac.

* If it says `Chip: Apple M1`, `M2`, etc. use Apple Silicon.
* If it says `Processor: Intel`, use Intel.

Open the `.dmg`, then drag `Curiosity Coding Interface.app` into Applications.

This macOS build is unsigned. If macOS says the app is damaged, run:

```sh
sudo xattr -dr com.apple.quarantine "/Applications/Curiosity Coding Interface.app"
```

If it still fails with a code-signature error, run:

```sh
sudo codesign --force --deep --sign - "/Applications/Curiosity Coding Interface.app"
sudo xattr -dr com.apple.quarantine "/Applications/Curiosity Coding Interface.app"
```

### Windows

Download and run:

```txt
Curiosity-Coding-Interface-Windows.exe
```

