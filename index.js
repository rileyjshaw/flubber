'use strict';

/**
 * Nobody's perfect! Takes a MIDI file and messes up a few of the notes :)
 *
 * Usage:
 *  > npm i
 *  > node index.js [path/to/midi/file.mid [path/to/output.mid]]
 */
const fs = require('fs');
const {parseMidi, writeMidi} = require('midi-file');
const {ceil, floor, random} = Math;

// Approximate % of notes that will be played correctly.
const skill = 19 / 20;
// How close the missed notes should be to the intended note. We only extend
// out of this range if all surrounding options are already held.
const flubProximity = 2;
// List of notes that are currently being "held down".
const heldKeys = {};
// List of numbers mapping note intended to hit => note actually hit.
const flubbedNotes = {};

// Pull in a list of tracks from the MIDI file.
const inFile = process.argv[2] || './moonlight.mid';
const outFile = process.argv[3] || './flubbed.mid';
const midiFile = fs.readFileSync(inFile);
const song = parseMidi(midiFile);

// Each MIDI track is a series of events, some of which indicate noteOn or
// noteOff.
song.tracks.forEach(track => track.forEach(event => {
	const {type, noteNumber, velocity} = event;
	const noteOn = type === 'noteOn';
	const noteOff = type === 'noteOff' || noteOn && !velocity;

	if (noteOff) {
		let note = noteNumber;

		// If the note was flubbed, we use the note that was actually played.
		const actualNote = flubbedNotes[noteNumber];
		if (typeof actualNote === 'number') {
			note = event.noteNumber = actualNote;
			delete flubbedNotes[noteNumber];
		}

		heldKeys[note] = false;
	} else if (noteOn) {
		let note = noteNumber;

		// Flub it, perhaps?
		if (heldKeys[noteNumber] || random() > skill) {
			let i = 0;
			do {
				// Slowly increase the flubRange to prevent infinite loops when
				// all the notes within range are already held down.
				const flubRange = flubProximity + floor(i / 20);
				const sign = random() < 0.5 ? 1 : -1;
				note = noteNumber + sign * ceil(random() * flubRange);
				++i;
			} while(heldKeys[note]);

			event.noteNumber = note;
			flubbedNotes[noteNumber] = note;
		}

		heldKeys[note] = true;
	}
}));

// Write the modified song to disk.
const output = writeMidi(song);
const outputBuffer = Buffer.from(output);
fs.writeFileSync(outFile, outputBuffer);
