export interface LatestPiRelease {
	version: string;
	packageName?: string;
	note?: string;
}

export async function checkForNewPiVersion(_currentVersion: string): Promise<LatestPiRelease | undefined> {
	// GreenPi has no update channel: pi.dev serves upstream releases, which must
	// not be offered as GreenPi updates. New versions are published at
	// https://github.com/ColbyBrown/GreenPi.
	void _currentVersion;
	return undefined;
}
