#!/usr/bin/env python3
"""
Generates the site's instrumental pieces from scratch, so there is nothing to license.

Each piece is a tanpura drone with an improvised melody that stays inside one
Carnatic raga, played on a synthesised veena, flute or violin, with a soft
mridangam pulse in Adi tala. These are computer-made sketches in the idiom, not
recordings of musicians or of any existing composition.

    python3 scripts/generate-music.py                # writes public/audio/hamsadhwani.mp3
    python3 scripts/generate-music.py mohanam kalyani # other ragas

Needs numpy and ffmpeg. To use real recordings instead, put your own files in
public/audio and point `music.src` at them in src/config/wedding.ts.
"""
import math, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "audio")
SA = 146.83  # D3, the tonic for every piece

# Swaras as semitones above Sa. `rest` lists the notes a phrase may settle on.
RAGAS = {
    "hamsadhwani":      dict(scale=[0, 2, 4, 7, 11],        rest=[0, 7, 4],  instrument="veena",  octave=1, bpm=84, seed=11),
    "mohanam":          dict(scale=[0, 2, 4, 7, 9],         rest=[0, 4, 7],  instrument="flute",  octave=2, bpm=76, seed=23),
    "kalyani":          dict(scale=[0, 2, 4, 6, 7, 9, 11],  rest=[0, 4, 7, 11], instrument="violin", octave=2, bpm=66, seed=37),
    "shankarabharanam": dict(scale=[0, 2, 4, 5, 7, 9, 11],  rest=[0, 4, 7],  instrument="veena",  octave=1, bpm=72, seed=41),
    "madhyamavati":     dict(scale=[0, 2, 5, 7, 10],        rest=[0, 7, 2, 5], instrument="flute", octave=2, bpm=70, seed=53),
}

def cents(c): return 2.0 ** (c / 1200.0)

def pitch_curve(f_from, f_to, n, glide_s, vib_hz, vib_cents, vib_delay_s):
    """Per-sample frequency: slide in from the previous note, then a delayed oscillation."""
    t = np.arange(n) / SR
    g = np.clip(t / max(glide_s, 1e-4), 0, 1)
    g = g * g * (3 - 2 * g)
    f = f_from * (f_to / f_from) ** g
    if vib_cents:
        depth = vib_cents * np.clip((t - vib_delay_s) / 0.25, 0, 1)
        f = f * cents(depth * np.sin(2 * np.pi * vib_hz * t))
    return f, t

def veena(f_from, f_to, dur, rng):
    n = int((dur + 1.6) * SR)  # let the string ring past the note
    kampita = 26 if dur > 0.7 and rng.random() < 0.6 else 0
    f, t = pitch_curve(f_from, f_to, n, 0.07, 4.6, kampita, 0.18)
    ph = 2 * np.pi * np.cumsum(f) / SR
    out = np.zeros(n)
    for h in range(1, 12):
        if f_to * h > 9000: break
        out += np.sin(h * ph) * (1.0 / h ** 1.15) * np.exp(-t * (1.3 + 0.55 * h))
    out *= np.minimum(1, t / 0.004)
    pluck = rng.standard_normal(n) * np.exp(-t * 180) * 0.12
    return (out + pluck) * 0.55

def flute(f_from, f_to, dur, rng):
    n = int((dur + 0.12) * SR)
    f, t = pitch_curve(f_from, f_to, n, 0.09, 5.0, 14 if dur > 0.5 else 0, 0.22)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.07) * np.clip((dur + 0.12 - t) / 0.12, 0, 1)
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    breath = np.convolve(rng.standard_normal(n), np.ones(24) / 24, mode="same") * 0.5
    return (tone + breath * (0.5 + 0.5 * np.exp(-t * 14))) * env * 0.32

def violin(f_from, f_to, dur, rng):
    n = int((dur + 0.16) * SR)
    f, t = pitch_curve(f_from, f_to, n, 0.12, 5.4, 20 if dur > 0.45 else 0, 0.2)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.09) * np.clip((dur + 0.16 - t) / 0.16, 0, 1)
    out = np.zeros(n)
    for h in range(1, 14):
        if f_to * h > 8000: break
        out += np.sin(h * ph + 0.3 * h) / h ** 1.35
    return out * env * (0.9 + 0.1 * np.sin(2 * np.pi * 0.7 * t)) * 0.3

VOICES = dict(veena=veena, flute=flute, violin=violin)

def tanpura_pluck(freq, dur=6.0):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t)
    for h in range(1, 22):
        # The bridge's buzz (jivari) makes the upper partials bloom after the pluck.
        bloom = 1 - np.exp(-t * (1.5 + 0.2 * h))
        out += np.sin(2 * np.pi * freq * h * t + 0.5 * h) / h ** 0.85 * np.exp(-t * (0.45 + 0.05 * h)) * (0.55 + 0.45 * bloom * np.cos(2 * np.pi * 0.11 * h * t))
    return out * np.minimum(1, t / 0.01) * 0.11

def mridangam(kind, rng):
    if kind == "thom":
        t = np.arange(int(0.45 * SR)) / SR
        return np.sin(2 * np.pi * (74 * t + 26 * (1 - np.exp(-t * 26)) / 26)) * np.exp(-t * 9) * 0.5
    t = np.arange(int(0.16 * SR)) / SR
    ring = sum(np.sin(2 * np.pi * SA * 2 * h * t) / h for h in (1, 2, 3))
    return (ring * np.exp(-t * (38 if kind == "nam" else 60)) + rng.standard_normal(len(t)) * np.exp(-t * 220) * 0.4) * (0.2 if kind == "nam" else 0.12)

def melody(raga, rng, half_beats):
    """A list of (semitone or None, length in half-beats): slow opening, then rhythmic phrases."""
    scale = raga["scale"]
    ladder = [s - 12 for s in scale if s >= 7] + scale + [s + 12 for s in scale if s <= 7]
    rests = {r + o for r in raga["rest"] for o in (-12, 0, 12)}
    home = ladder.index(0)
    notes, i, direction, used = [], home, 1, 0

    def step():
        nonlocal i, direction
        if rng.random() < 0.24: direction = -direction
        i += direction * (2 if rng.random() < 0.14 else 1)
        if i <= 0: i, direction = 1, 1
        if i >= len(ladder) - 1: i, direction = len(ladder) - 2, -1

    opening = int(half_beats * 0.2)
    while used < half_beats - 14:
        slow = used < opening
        phrase = int(rng.integers(3, 6)) if slow else int(rng.integers(5, 10))
        for k in range(phrase):
            last = k == phrase - 1
            if last:
                for _ in range(4):
                    if ladder[i] in rests: break
                    step()
            length = int(rng.choice([4, 6, 8])) if slow else (int(rng.choice([4, 6])) if last else int(rng.choice([1, 1, 2, 2, 2, 3])))
            notes.append((ladder[i], length)); used += length
            if not last: step()
        pause = 2 if slow else int(rng.choice([1, 2]))
        notes.append((None, pause)); used += pause
    # Come home: walk down to Sa and hold it.
    while ladder[i] != 0:
        i += -1 if i > home else 1
        notes.append((ladder[i], 2 if ladder[i] else 10))
    if notes[-1][0] != 0: notes.append((0, 10))
    return notes

def reverb(x, seed, seconds=1.8, wet=0.2):
    rng = np.random.default_rng(seed)
    t = np.arange(int(seconds * SR)) / SR
    ir = rng.standard_normal(len(t)) * np.exp(-t * 3.4); ir[: int(0.012 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    n = len(x) + len(ir) - 1
    size = 1 << (n - 1).bit_length()
    tail = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x + wet * tail

def render(name, raga):
    rng = np.random.default_rng(raga["seed"])
    half = 60.0 / raga["bpm"] / 2
    total_half = int(84 / half)
    notes = melody(raga, rng, total_half)
    length_s = sum(l for _, l in notes) * half + 6.0
    n = int(length_s * SR)
    lead, drone, drum = np.zeros(n + SR * 8), np.zeros(n + SR * 8), np.zeros(n + SR * 8)

    def add(buf, at_s, sound):
        a = int(at_s * SR); buf[a : a + len(sound)] += sound[: len(buf) - a]

    # Tanpura: Pa, Sa, Sa, low Sa, round and round.
    plucks = [tanpura_pluck(SA * 1.5), tanpura_pluck(SA * 2), tanpura_pluck(SA * 2 * cents(4)), tanpura_pluck(SA)]
    at, k = 0.0, 0
    while at < length_s:
        add(drone, at, plucks[k % 4]); at += 1.15 if k % 4 != 3 else 1.6; k += 1

    voice, base = VOICES[raga["instrument"]], SA * 2 ** raga["octave"]
    at, prev = 2.5, None
    start = at
    for semis, l in notes:
        dur = l * half
        if semis is not None:
            f = base * 2 ** (semis / 12)
            add(lead, at, voice(prev if prev and abs(math.log2(f / prev)) < 0.5 else f * cents(-40), f, dur, rng))
            prev = f
        else:
            prev = None
        at += dur
    end = at

    # Mridangam joins after the slow opening: an eight-beat cycle, played softly.
    cycle = ["thom", None, "ta", "nam", None, "ta", "nam", "ta", "thom", None, "ta", "nam", "ta", "nam", "ta", "nam"]
    drum_from = start + (end - start) * 0.22
    beat = math.ceil((drum_from - start) / (half * 16)) * 16
    while start + beat * half < end - 10 * half:
        stroke = cycle[beat % 16]
        if stroke: add(drum, start + beat * half, mridangam(stroke, rng) * (1.0 if beat % 16 == 0 else 0.8))
        beat += 1

    mix = (lead + 0.9 * drone + 0.6 * drum)[:n]
    left, right = reverb(mix, raga["seed"]), reverb(mix, raga["seed"] + 1)
    stereo = np.stack([left, right], axis=1)
    fade_in, fade_out = int(1.2 * SR), int(5.0 * SR)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None] ** 1.5
    stereo = np.tanh(stereo / np.max(np.abs(stereo)) * 1.15) * 0.89

    os.makedirs(OUT, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        path = tmp.name
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((stereo * 32767).astype("<i2").tobytes())
    target = os.path.join(OUT, f"{name}.mp3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-codec:a", "libmp3lame", "-b:a", "112k",
                    "-metadata", f"title=Raga {name.capitalize()}", "-metadata", "artist=Sweekruti & Siddhanth wedding site",
                    "-metadata", "comment=Original synthesised piece", target], check=True)
    os.unlink(path)
    print(f"{name:18s} {length_s:5.1f}s  {os.path.getsize(target) / 1024:6.0f} KB")

if __name__ == "__main__":
    # Default: just the track the site uses. Pass other raga names to render them too.
    for name in (sys.argv[1:] or ["hamsadhwani"]):
        render(name, RAGAS[name])
