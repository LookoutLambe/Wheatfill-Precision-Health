/**
 * Curated third-party entry points for peptide science (lab, quality, analysis).
 * Titles and blurbs are original; not republished from any vendor “hub.”
 */
export type PeptideHubItem = {
  title: string
  blurb: string
  href: string
  source: string
}

export type PeptideHubCategory = {
  id: string
  heading: string
  lead: string
  items: PeptideHubItem[]
}

export const PEPTIDE_HUB_CATEGORIES: PeptideHubCategory[] = [
  {
    id: 'regulation-context',
    heading: 'Regulation and evidence',
    lead: 'U.S. policy and how to read the medical literature on peptides at a high level.',
    items: [
      {
        title: 'Human drug compounding (FDA hub)',
        blurb: 'Federal frame for what compounding is, what 503A/503B mean, and how enforcement and policy evolve.',
        href: 'https://www.fda.gov/drugs/human-drug-compounding',
        source: 'U.S. FDA',
      },
      {
        title: 'PubMed: “peptide” or specific molecule',
        blurb: 'Index of peer‑reviewed literature; use filters (species, study type, year) instead of a single article summary.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=peptide&sort=date',
        source: 'NIH / PubMed',
      },
      {
        title: 'NCBI Bookshelf (search)',
        blurb: 'Textbooks and government‑sponsored book resources that sometimes cover peptide biologics and chemistry at a survey level.',
        href: 'https://www.ncbi.nlm.nih.gov/books/?term=peptide',
        source: 'NCBI',
      },
    ],
  },
  {
    id: 'handling-storage',
    heading: 'Lyophilized material, reconstitution, and storage',
    lead: 'Research-laboratory and pharmacy-adjacent themes: stability of dry powder, dilution, and storage variables.',
    items: [
      {
        title: 'PubMed: lyophilized peptide (recent)',
        blurb: 'Primary literature on lyophilized peptide and protein stability, formulation, and excipients—read methods sections carefully.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=lyophilized+peptide&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: peptide reconstitution or bacteriostatic',
        blurb: 'Papers that discuss reconstitution media, pH, and preservative choice in research or pharmaceutical contexts (not a universal recipe).',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=peptide+reconstitution+OR+bacteriostatic+water+peptide&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: peptide storage temperature and shelf',
        blurb: 'Model-dependent work on storage temperature, light, and time under various matrices.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=peptide+storage+temperature+stability&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'MedlinePlus: using medicines safely (context)',
        blurb: 'Consumer-facing basics on using injectable or prescribed medicines with a clinician; not specific to any research peptide.',
        href: 'https://medlineplus.gov/ency/patientinstructions/000512.htm',
        source: 'NIH MedlinePlus',
      },
    ],
  },
  {
    id: 'quality-sterility-endotoxin',
    heading: 'Quality: sterility, endotoxin, and certificates of analysis',
    lead: 'Why compounding and manufacturing standards reference sterility, pyrogen/endotoxin limits, and third‑party test reports.',
    items: [
      {
        title: 'USP compounding and quality (overview)',
        blurb: 'United States Pharmacopeia resources on compounding quality expectations used by many pharmacies and boards.',
        href: 'https://www.usp.org/health-care-quality-safety/health-systems-hospitals-and-compounding',
        source: 'USP',
      },
      {
        title: 'PubMed: endotoxin or LAL in pharmaceutical or biological product',
        blurb: 'Analytical and validation literature on limulus / endotoxin testing in drug and biologic quality systems.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=endotoxin+LAL+pharmaceutical&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: sterile compounding or cleanroom',
        blurb: 'Papers and reviews on environmental control, aseptic technique, and contamination control in preparation settings.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=sterile+compounding+cleanroom&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: certificate of analysis OR COA quality control peptide',
        blurb: 'How identity, purity, and impurity testing are discussed in the context of small peptides and similar materials in research supply chains.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=%22certificate+of+analysis%22+peptide+OR+COA+quality+peptide&sort=date',
        source: 'PubMed (search)',
      },
    ],
  },
  {
    id: 'analytical-biochem',
    heading: 'Analytical and structural characterization',
    lead: 'How labs separate, identify, and interrogate peptide structure and degradation.',
    items: [
      {
        title: 'PubMed: HPLC and peptide',
        blurb: 'High‑performance liquid chromatography in peptide separation and purity work.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=HPLC+peptide+purification&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: mass spectrometry and peptide',
        blurb: 'MS-based identification, sequencing assistance, and fragmentation in peptide and proteomics work.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=mass+spectrometry+peptide&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: MALDI peptide',
        blurb: 'Matrix-assisted laser desorption/ionization as used in many peptide and protein labs.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=MALDI+peptide&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: circular dichroism peptide structure',
        blurb: 'Spectroscopic approaches to secondary structure and conformational change for peptides in solution.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=circular+dichroism+peptide+structure&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: solid phase extraction peptide',
        blurb: 'Sample prep and cleanup workflows that pair with chromatography and mass spectrometry.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=solid+phase+extraction+peptide&sort=date',
        source: 'PubMed (search)',
      },
      {
        title: 'PubMed: enzymatic degradation peptide stability',
        blurb: 'Kinetics and protection strategies when peptides encounter proteases in model systems.',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=enzymatic+degradation+peptide+stability&sort=date',
        source: 'PubMed (search)',
      },
    ],
  },
]
