export interface AffectedBrainArea {
	areaId: string;
	name: string;
	effectType?: "stimulates" | "depresses" | "damages" | "modulates";
}

export interface NeurotransmitterEffect {
	name: string;
	effect: "increase" | "decrease" | "modulate";
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
