export type BrainSectionEffectType =
	| "stimulates"
	| "depresses"
	| "damages"
	| "modulates";

export interface AffectedBrainArea {
	areaId: string;
	name: string;
	effectType?: BrainSectionEffectType;
}

export interface NeurotransmitterEffect {
	name: string;
	mechanism?: string;
	description?: string;
	effect?: "increase" | "decrease" | "modulate" | string;
}

export interface TemporalPhase {
	brainImpact?: string;
	affectedBrainAreas?: AffectedBrainArea[];
	neurotransmitters?: NeurotransmitterEffect[];
}

export interface BrainItemData {
	id: string;
	name: string;
	category?: string;
	shortDescription?: string;
	phases?: {
		acute?: TemporalPhase;
		chronic?: TemporalPhase;
		withdrawal?: TemporalPhase;
	};
	researchSources?: string[];
}

export interface AtlasSection {
	title: string;
	items: BrainItemData[];
}
