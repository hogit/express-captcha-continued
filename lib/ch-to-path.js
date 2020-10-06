'use strict';
const assert = require('assert');

function rndPathCmd(cmd) {
	const r = (Math.random() * 0.2) - 0.1;

	switch (cmd.type) {
		case 'M': 
		case 'L':
			cmd.x += r;
			cmd.y += r;
			break;
		case 'Q': 
		case 'C':
			cmd.x += r;
			cmd.y += r;
			cmd.x1 += r;
			cmd.y1 += r;
			break;
		default:
			// Close path cmd
			break;
	}

	return cmd;
}

function splitQuadraticBezier(position, x1, y1, x2, y2, x3, y3) {
	let v1, v2, v3, retPoints, i, c;

	if (position <= 0 || position >= 1) {
		throw RangeError("spliteCurveAt requires position > 0 && position < 1");
	}

	retPoints = []; // array of coordinates
	i = 0;
	v1 = {};
	v2 = {};
	v3 = {};
	v1.x = x1;
	v1.y = y1;
	v2.x = x2;
	v2.y = y2;
	v3.x = x3;
	v3.y = y3;

	c = position;
	retPoints[i++] = v1.x;  // start point
	retPoints[i++] = v1.y;
	retPoints[i++] = (v1.x += (v2.x - v1.x) * c);  // new control point for first curve
	retPoints[i++] = (v1.y += (v2.y - v1.y) * c);
	v2.x += (v3.x - v2.x) * c;
	v2.y += (v3.y - v2.y) * c;
	retPoints[i++] = v1.x + (v2.x - v1.x) * c;  // new end and start of first and second curves
	retPoints[i++] = v1.y + (v2.y - v1.y) * c;
	retPoints[i++] = v2.x;  // new control point for second curve
	retPoints[i++] = v2.y;
	retPoints[i++] = v3.x;  // new endpoint of second curve
	retPoints[i++] = v3.y;
	return retPoints;
}

function randomRange(min, max) {
	return Math.random() * (max - min) + min;
}

function randomizePathNodes(commands, truncateLineProbability, truncateCurveProbability, truncateCurvePositionMin, truncateCurvePositionMax) {
	const result = [];
	for (let i = 0; i < commands.length - 1; i++) {
		const command = commands[i];
		if (command.type === "L") {
			const next = commands[i + 1];
			if (next.type === "L" && Math.random() > truncateLineProbability) {
				const r = randomRange(-0.1, 0.1);
				result.push(command);
				result.push({
					type: "L",
					x: (command.x + next.x) / 2 + r,
					y: (command.y + next.y) / 2 + r,
				});
			} else {
				result.push(command);
			}
		} else if (command.type === "Q" && i >= 1) {
			const prev = commands[i - 1];
			if ((prev.type === "L" || prev.type === "M") && Math.random() > truncateCurveProbability) {
				const p0_x = prev.x;
				const p0_y = prev.y;
				const r = randomRange(-0.1, 0.1);
				const cp_x = command.x1 + r;
				const cp_y = command.y1 + r;
				const p1_x = command.x + r;
				const p1_y = command.y + r;
				const newCurve = splitQuadraticBezier(randomRange(truncateCurvePositionMin, truncateCurvePositionMax), p0_x, p0_y, cp_x, cp_y, p1_x, p1_y);

				const q1 = {
					type: "Q",
					x1: newCurve[2],
					y1: newCurve[3],
					x: newCurve[4],
					y: newCurve[5],
				};
				const l1 = {
					type: "L",
					x: newCurve[4],
					y: newCurve[5],
				};
				const q2 = {
					type: "Q",
					x1: newCurve[6],
					y1: newCurve[7],
					x: newCurve[8],
					y: newCurve[9],
				};
				const l2 = {
					type: "L",
					x: newCurve[8],
					y: newCurve[9],
				};
				result.push(q1);
				result.push(l1);
				result.push(q2);
				result.push(l2);
			}

		} else {
			result.push(command)
		}
	}
	return result;
}

module.exports = function (char, x, y, fontSize, font, truncateLineProbability, truncateCurveProbability, truncateCurvePositionMin, truncateCurvePositionMax) {
	const fontScale = fontSize / font.unitsPerEm;

	const glyph = font.charToGlyph(char);
	const width = glyph.advanceWidth ? glyph.advanceWidth * fontScale : 0;
	const left = x - (width / 2);

	const height = (font.ascender + font.descender) * fontScale;
	const top = y + (height / 2);
	const path = glyph.getPath(left, top, fontSize);
	// Randomize path commands
	path.commands.forEach(rndPathCmd);
	path.commands = randomizePathNodes(path.commands, truncateLineProbability, truncateCurveProbability, truncateCurvePositionMin, truncateCurvePositionMax);

	const pathData = path.toPathData();

	return pathData;
};
