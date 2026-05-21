/**
 * Brain section definitions — each key is a section name,
 * the value is an array of mesh IDs belonging to that section.
 *
 * A single mesh can appear in multiple sections (e.g. structures
 * that span both the Limbic System and Temporal Lobe).
 */

export type BrainSectionName =
  | "Frontal Lobe"
  | "Parietal Lobe"
  | "Occipital Lobe"
  | "Temporal Lobe"
  | "Insular Cortex"
  | "Hippocampus"
  | "Nucleus Accumbens"
  | "Amygdala"
  | "Ventral Tegmental Area"
  | "Limbic System"
  | "Basal Ganglia"
  | "Thalamus"
  | "Hypothalamus"
  | "Cerebellum"
  | "Brainstem"
  | "White Matter"
  | "Ventricular System"
  | "Other";

export const brainSections: Record<BrainSectionName, string[]> = {

  "Frontal Lobe": [
    "precentral_gyrus_L",
    "superior_frontal_gyrus_L",
    "middle_frontal_gyrus_L",
    "inferior_frontal_gyrus_triangular_part_L",
    "inferior_frontal_gyrus_opercular_part_L",
    "gyrus_rectus_straight_gyrus_L",
    "medial_orbital_gyrus_L",
    "anterior_intermediate_orbital_gyrus_L",
    "posterior_intermediate_orbital_gyrus_L",
    "lateral_orbital_gyrus_L",
    "paracentral_lobule_rostral_part_L",
    "frontal_operculum_L",
    "paracingulate_gyrus_L",
    "rostral_gyrus_L",
    "frontomarginal_gyrus_L",
    "frontal_pole_L",
    "precentral_gyrus_R",
    "superior_frontal_gyrus_R",
    "middle_frontal_gyrus_R",
    "inferior_frontal_gyrus_triangular_part_R",
    "inferior_frontal_gyrus_opercular_part_R",
    "gyrus_rectus_straight_gyrus_R",
    "medial_orbital_gyrus_R",
    "anterior_intermediate_orbital_gyrus_R",
    "posterior_intermediate_orbital_gyrus_R",
    "lateral_orbital_gyrus_R",
    "paracentral_lobule_rostral_part_R",
    "frontal_operculum_R",
    "paracingulate_gyrus_R",
    "rostral_gyrus_R",
    "frontomarginal_gyrus_R",
    "frontal_pole_R"
  ],
  "Parietal Lobe": [
    "postcentral_gyrus_L",
    "supraparietal_lobule_L",
    "supramarginal_gyrus_L",
    "angular_gyrus_L",
    "precuneus_L",
    "paracentral_lobule_caudal_part_L",
    "parietal_operculum_L",
    "postcentral_gyrus_R",
    "supraparietal_lobule_R",
    "supramarginal_gyrus_R",
    "angular_gyrus_R",
    "precuneus_R",
    "paracentral_lobule_caudal_part_R",
    "parietal_operculum_R"
  ],
  "Occipital Lobe": [
    "occipital_pole_L",
    "cuneus_L",
    "lingual_gyrus_medial_occipitotemporal_gyrus_L",
    "lateral_occipitotemporal_fusiform_gyrus_occipital_part_L",
    "inferior_occipital_gyrus_L",
    "superior_occipital_gyrus_L",
    "occipital_pole_R",
    "cuneus_R",
    "lingual_gyrus_medial_occipitotemporal_gyrus_R",
    "lateral_occipitotemporal_fusiform_gyrus_occipital_part_R",
    "inferior_occipital_gyrus_R",
    "superior_occipital_gyrus_R"
  ],
  "Temporal Lobe": [
    "superior_temporal_gyrus_L",
    "middle_temporal_gyrus_L",
    "inferior_temporal_gyrus_L",
    "occipitotemporal_fusiform_gyrus_temporal_part_L",
    "transverse_temporal_gyrus_Heschls_gyrus_L",
    "planum_temporale_L",
    "temporal_pole_L",
    "planum_polare_L",
    "perirhinal_gyrus_rostral_part_of_FuGt_L",
    "superior_temporal_gyrus_R",
    "middle_temporal_gyrus_R",
    "inferior_temporal_gyrus_R",
    "occipitotemporal_fusiform_gyrus_temporal_part_R",
    "transverse_temporal_gyrus_Heschls_gyrus_R",
    "planum_temporale_R",
    "temporal_pole_R",
    "planum_polare_R",
    "perirhinal_gyrus_rostral_part_of_FuGt_R"
  ],
  "Insular Cortex": [
    "frontal_agranular_insular_cortex_area_Fl_L",
    "temporal_agranular_insular_cortex_area_Tl_L",
    "long_insular_gyri_L",
    "short_insular_gyri_L",
    "limen_insula_L",
    "frontal_agranular_insular_cortex_area_Fl_R",
    "temporal_agranular_insular_cortex_area_Tl_R",
    "long_insular_gyri_R",
    "short_insular_gyri_R",
    "limen_insula_R"
  ],
  "Hippocampus": [
    "head_of_hippocampus_L",
    "body_of_hippocampus_L",
    "tail_of_hippocampus_L",
    "head_of_hippocampus_R",
    "body_of_hippocampus_R",
    "tail_of_hippocampus_R"
  ],
  "Nucleus Accumbens": [
    "nucleus_accumbens_L",
    "nucleus_accumbens_R"
  ],
  "Amygdala": [
    "amygdaloid_complex_L",
    "anterior_amygdaloid_area_L",
    "central_nuclear_group_L",
    "lateral_nucleus_L",
    "basolateral_nucleus_basal_nucleus_L",
    "basomedial_nucleus_accessory_basal_nucleus_L",
    "anterior_cortical_nucleus_L",
    "posterior_cortical_nucleus_L",
    "medial_nucleus_L",
    "amygdalohippocampal_area_L",
    "amygdaloid_complex_R",
    "anterior_amygdaloid_area_R",
    "central_nuclear_group_R",
    "lateral_nucleus_R",
    "basolateral_nucleus_basal_nucleus_R",
    "basomedial_nucleus_accessory_basal_nucleus_R",
    "anterior_cortical_nucleus_R",
    "posterior_cortical_nucleus_R",
    "medial_nucleus_R",
    "amygdalohippocampal_area_R"
  ],
  "Ventral Tegmental Area": [],
  "Limbic System": [
    "olfactory_bulb_L",
    "anterior_olfactory_nucleus_L",
    "piriform_region_L",
    "basal_forebrain_L",
    "septal_nuclei_L",
    "bed_nucleus_of_stria_terminalis_L",
    "cingulate_gyrus_rostral_anterior_part_L",
    "cingulate_gyrus_caudal_posterior_part_L",
    "ingulo_parahippocampal_isthmus_L",
    "subcallosal_gyrus_parolfactory_gyrus_L",
    "anterior_parahippocampal_gyrus_L",
    "posterior_parahippocampal_gyrus_L",
    "gyrus_ambiens_L",
    "lateral_olfactory_gyrus_L",
    "olfactory_bulb_R",
    "anterior_olfactory_nucleus_R",
    "piriform_region_R",
    "basal_forebrain_R",
    "septal_nuclei_R",
    "bed_nucleus_of_stria_terminalis_R",
    "cingulate_gyrus_rostral_anterior_part_R",
    "cingulate_gyrus_caudal_posterior_part_R",
    "ingulo_parahippocampal_isthmus_R",
    "subcallosal_gyrus_parolfactory_gyrus_R",
    "anterior_parahippocampal_gyrus_R",
    "posterior_parahippocampal_gyrus_R",
    "gyrus_ambiens_R",
    "lateral_olfactory_gyrus_R"
  ],
  "Basal Ganglia": [
    "head_of_caudate_L",
    "body_of_caudate_L",
    "tail_of_caudate_L",
    "putamen_L",
    "external_segment_of_globus_pallidus_L",
    "internal_segment_of_globus_pallidus_L",
    "claustrum_L",
    "posteroventral_putamen_L",
    "subthalamic_nucleus_L",
    "head_of_caudate_R",
    "body_of_caudate_R",
    "tail_of_caudate_R",
    "putamen_R",
    "external_segment_of_globus_pallidus_R",
    "internal_segment_of_globus_pallidus_R",
    "claustrum_R",
    "posteroventral_putamen_R",
    "subthalamic_nucleus_R"
  ],
  "Thalamus": [
    "thalamus_L",
    "anterior_nuclear_complex_of_thalamus_L",
    "lateral_dorsal_nucleus_of_thalamus_L",
    "mediodorsal_nucleus_of_thalamus_L",
    "reuniens_nucleus_medioventral_nucleus_of_thalamus_L",
    "lateral_posterior_nucleus_of_thalamus_L",
    "pulvinar_of_thalamus_L",
    "ventral_anterior_nucleus_of_thalamus_L",
    "ventral_lateral_nucleus_of_thalamus_L",
    "ventral_posterior_lateral_nucleus_L",
    "ventral_posterior_medial_nucleus_L",
    "dorsal_lateral_geniculate_nucleus_L",
    "medial_geniculate_nuclei_L",
    "centromedian_nucleus_of_thalamus_L",
    "parafascicular_nucleus_of_thalamus_L",
    "habenular_nuclei_L",
    "pineal_body_L",
    "zona_incerta_L",
    "midline_nuclear_complex_L",
    "thalamus_R",
    "anterior_nuclear_complex_of_thalamus_R",
    "lateral_dorsal_nucleus_of_thalamus_R",
    "mediodorsal_nucleus_of_thalamus_R",
    "reuniens_nucleus_medioventral_nucleus_of_thalamus_R",
    "lateral_posterior_nucleus_of_thalamus_R",
    "pulvinar_of_thalamus_R",
    "ventral_anterior_nucleus_of_thalamus_R",
    "ventral_lateral_nucleus_of_thalamus_R",
    "ventral_posterior_lateral_nucleus_R",
    "ventral_posterior_medial_nucleus_R",
    "dorsal_lateral_geniculate_nucleus_R",
    "medial_geniculate_nuclei_R",
    "centromedian_nucleus_of_thalamus_R",
    "parafascicular_nucleus_of_thalamus_R",
    "habenular_nuclei_R",
    "pineal_body_R",
    "zona_incerta_R",
    "midline_nuclear_complex_R"
  ],
  "Hypothalamus": [
    "supraoptic_region_of_HTH_L",
    "preoptic_region_of_HTH_L",
    "tuberal_region_of_HTH_L",
    "hypothalamus_L",
    "mammillary_region_of_HTH_L",
    "supraoptic_region_of_HTH_R",
    "preoptic_region_of_HTH_R",
    "tuberal_region_of_HTH_R",
    "hypothalamus_R",
    "mammillary_region_of_HTH_R"
  ],
  "Cerebellum": [
    "cerebellar_vermis_L",
    "cerebellar_deep_nuclei_L",
    "paravermis_of_cerebellum_L",
    "lateral_hemisphere_of_cerebellum_L",
    "cerebellar_vermis_R",
    "cerebellar_deep_nuclei_R",
    "paravermis_of_cerebellum_R",
    "lateral_hemisphere_of_cerebellum_R"
  ],
  "Brainstem": [
    "pretectal_region_L",
    "substantia_nigra_L",
    "superior_colliculus_L",
    "cerebral_peduncle_crus_cerebri_L",
    "basilar_part_of_pons_L",
    "pontine_tegmentum_L",
    "pyramidal_part_of_medulla_oblongata_L",
    "tegmentum_of_medulla_oblongata_L",
    "inferior_olive_L",
    "central_canal_of_medulla_oblongata_L",
    "red_nucleus_L",
    "inferior_colliculus_L",
    "midbrain_tegmentum_L",
    "pretectal_region_R",
    "substantia_nigra_R",
    "superior_colliculus_R",
    "cerebral_peduncle_crus_cerebri_R",
    "basilar_part_of_pons_R",
    "pontine_tegmentum_R",
    "pyramidal_part_of_medulla_oblongata_R",
    "tegmentum_of_medulla_oblongata_R",
    "inferior_olive_R",
    "central_canal_of_medulla_oblongata_R",
    "red_nucleus_R",
    "inferior_colliculus_R",
    "midbrain_tegmentum_R"
  ],
  "White Matter": [
    "white_matter_of_forebrain_L",
    "anterior_commissure_L",
    "corpus_callosum_L",
    "fornix_L",
    "mammillothalamic_tract_L",
    "optic_tract_L",
    "white_matter_of_hindbrain_L",
    "olfactory_tract_L",
    "superior_cerebellar_peduncle_brachium_conjunctivum_L",
    "middle_cerebellar_peduncle_L",
    "inferior_cerebellar_peduncle_L",
    "optic_radiation_L",
    "white_matter_of_forebrain_R",
    "anterior_commissure_R",
    "corpus_callosum_R",
    "fornix_R",
    "mammillothalamic_tract_R",
    "optic_tract_R",
    "white_matter_of_hindbrain_R",
    "olfactory_tract_R",
    "superior_cerebellar_peduncle_brachium_conjunctivum_R",
    "middle_cerebellar_peduncle_R",
    "inferior_cerebellar_peduncle_R",
    "optic_radiation_R",
    "VH_M_optic_chiasm"
  ],
  "Ventricular System": [
    "anterior_horn_of_lateral_ventricle_L",
    "body_of_lateral_ventricle_L",
    "posterior_horn_of_lateral_ventricle_L",
    "inferior_horn_of_lateral_ventricle_L",
    "third_ventricle_L",
    "cerebral_aqueduct_L",
    "fourth_ventricle_L",
    "atrium_of_lateral_ventricle_L",
    "anterior_horn_of_lateral_ventricle_R",
    "body_of_lateral_ventricle_R",
    "posterior_horn_of_lateral_ventricle_R",
    "inferior_horn_of_lateral_ventricle_R",
    "third_ventricle_R",
    "cerebral_aqueduct_R",
    "fourth_ventricle_R",
    "atrium_of_lateral_ventricle_R"
  ],
  "Other": []
};

/**
 * Reverse lookup: mesh ID → array of section names it belongs to.
 * Built once at module load time for O(1) lookups.
 */
export const meshToSections: Record<string, BrainSectionName[]> = (() => {
  const map: Record<string, BrainSectionName[]> = {};
  for (const [section, ids] of Object.entries(brainSections) as [BrainSectionName, string[]][]) {
    for (const id of ids) {
      if (!map[id]) map[id] = [];
      map[id].push(section);
    }
  }
  return map;
})();

/** Returns all mesh IDs that belong to any of the given sections. */
export function getMeshIdsForSections(sections: BrainSectionName[]): string[] {
  const set = new Set<string>();
  for (const section of sections) {
    for (const id of brainSections[section] ?? []) {
      set.add(id);
    }
  }
  return Array.from(set);
}
