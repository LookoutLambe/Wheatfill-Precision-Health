/**
 * Educational copy for precision-medicine peptide topics (not medical advice).
 * Used on /peptides and summarized on /medications for discovery.
 */

export type PeptideId =
  | 'bpc157'
  | 'tb500'
  | 'ghkcu'
  | 'cjcipa'
  | 'semax'
  | 'motsc'
  | 'aod'
  | 'ta1'
  | 'kpv'

export type PeptideEducationLink = { label: string; href: string }

export type PeptideEducation = {
  id: PeptideId
  title: string
  pill: string
  oneLiner: string
  /** Shown on the product-style vial label (educational illustration, not a retail offer). */
  vialDisplayName: string
  /**
   * Plain, friendly one-card blurb: what people are usually after.
   * Detailed science stays in the accordion + learn-more links.
   */
  summary: string
  whatItIs: string
  /** Short mechanism / identity in care discussions (main panel). */
  whatItDoes: string
  /**
   * Stated in plain terms: the goals, settings, and reasons this peptide is discussed
   * for use—still educational; not a personal treatment recommendation.
   */
  whyUseIt: string
  regulatoryAndSafety: string
  /**
   * Fuller mechanisms, study types, and evidence context. Rendered only under
   * “Learn more: science & references,” not in the top sections.
   */
  learnMoreScience: string
  /**
   * Curated PubMed article entry points (peer‑reviewed literature; species, models, and endpoints vary).
   * Shown on the card and repeated in the full profile—broader search links remain under “Learn more.”
   */
  peerReviewedPicks: PeptideEducationLink[]
  learnMore: PeptideEducationLink[]
}

export const PEPTIDE_EDUCATION: PeptideEducation[] = [
  {
    id: 'bpc157',
    title: 'BPC-157',
    pill: 'Research',
    oneLiner: 'Tissue- and gut-barrier–related research models; not an FDA-approved use here by name.',
    vialDisplayName: 'BPC-157',
    summary:
      'Folks name this one when they want to feel like they are bouncing back from training, a nagging tendon or muscle, or a touchy stomach. The research you will see is mostly in animals and cells—open the full profile for how it is studied and the papers.',
    whatItIs:
      'BPC-157 is a synthetic peptide sequence studied mainly in animal and cell models. It is not an FDA-approved medication in the United States for a labeled indication.',
    whatItDoes:
      'In studies it is often framed as a signaling peptide looked at in injury, vessel, and gut-barrier models (mostly rodents and cells), not a labeled human drug with routine dosing like an FDA product.',
    whyUseIt:
      'In precision- and compounding-related discussions, it is most often brought up for goals like supporting recovery from soft-tissue or overuse issues, or GI and mucosal “barrier” comfort when people are looking beyond standard options. That is why the topic comes up—it is not proof it is right for you. Any real use would require a clinician who can weigh law, compounding status, and your history.',
    regulatoryAndSafety:
      'Peptide compounding rules, FDA enforcement, and state boards change over time. Marketing must avoid blanket “healing” claims. Wheatfill does not use this text to offer treatment.',
    learnMoreScience:
      'Mechanisms and data: Published work in experimental systems has looked at angiogenesis-related signaling, collagen and extracellular-matrix themes, and mucosal injury models. Human data are limited in scale and are not a substitute for phase 3 drug evidence. Use the links below as starting points; read abstracts and methods, not headlines.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed: rat model and BPC-157 in Pharmaceutics (2025)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/39861766/',
      },
      {
        label: 'Peer-reviewed work in PubMed: “BPC 157” or “BPC-157” (search, filter as you like)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=%22BPC+157%22+OR+%22BPC-157%22&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: BPC-157 (all years)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157&sort=date' },
      { label: 'PubMed: BPC-157 + tendon or muscle', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157+AND+%28tendon+OR+muscle%29' },
      { label: 'PubMed: BPC-157 + gastrointestinal', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157+AND+%28gastrointestinal+OR+intestinal%29' },
      { label: 'PubMed: BPC-157 + angiogenesis or VEGF', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=BPC-157+AND+%28angiogenesis+OR+VEGF%29' },
      { label: 'NCBI Books: search “peptide therapeutic”', href: 'https://www.ncbi.nlm.nih.gov/books/?term=peptide+therapeutic' },
      { label: 'FDA: human drug compounding (policy context)', href: 'https://www.fda.gov/drugs/human-drug-compounding' },
    ],
  },
  {
    id: 'tb500',
    title: 'TB-500 (Thymosin Beta-4)',
    pill: 'Research',
    oneLiner: 'Actin- and cell-movement research; not a U.S. labeled drug the way a pharmacy “standard of care” drug is.',
    vialDisplayName: 'TB-500',
    summary:
      'It comes up in the same “get me off the sideline” conversations as soft-tissue and overuse issues. Lab work is about how cells move and help tissue remodel—the full profile links the science.',
    whatItIs:
      'Thymosin beta-4 is a natural peptide; “TB-500” often refers to synthetic thymosin–beta-4–inspired research compounds discussed online—not one FDA “brand” product the way a single NDA drug is.',
    whatItDoes:
      'The biology tie-in is the actin cytoskeleton and cell migration—how cells move in wound and remodeling research models.',
    whyUseIt:
      'Athletes, trainers, and some clinics mention it when the goal is soft-tissue recovery, strain, or return-to-activity after injury (faster or smoother recovery than they feel with rest alone). Others ask about it for chronic overuse. Those are the typical reasons it is named in those circles; it is still not a generic U.S. pharmacy standard and needs legal and medical context.',
    regulatoryAndSafety:
      'Thymosin-related ingredients have been part of compounding and enforcement attention. This site is not a sourcing guide.',
    learnMoreScience:
      'Mechanisms and data: Basic research connects thymosin beta-4 to actin regulation, corneal and wound models, and cardiac and dermal repair themes in animals. “TB-500” as a name does not map one-to-one to a single public monograph. Use the searches to compare cell, animal, and any human work.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: thymosin beta-4 (chronological)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+beta-4&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: thymosin beta-4 + healing or tissue',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+beta-4+AND+%28tissue+OR+heal+OR+wound%29&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: thymosin beta-4 (sort by date)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+beta-4&sort=date' },
      { label: 'PubMed: thymosin beta-4 + wound healing', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+beta-4+AND+wound' },
      { label: 'PubMed: thymosin beta-4 + actin or cytoskeleton', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+beta-4+AND+%28actin+OR+cytoskeleton%29' },
      { label: 'PubMed: thymosin beta-4 + heart or cardiac (models)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+beta-4+AND+%28heart+OR+cardiac%29' },
      { label: 'NCBI Bookshelf: search “thymosin” (background)', href: 'https://www.ncbi.nlm.nih.gov/books/?term=thymosin' },
    ],
  },
  {
    id: 'ghkcu',
    title: 'GHK-Cu (Copper Peptide)',
    pill: 'Research',
    oneLiner: 'Dermal matrix & cosmetic-science R&D; injectable is a different (and stricter) conversation.',
    vialDisplayName: 'GHK-Cu',
    summary:
      'You will see this in serious skincare and “glow up” talk—lines, crepiness, and skin that looks healthier after a procedure or a rough season. The sweet spot in research is usually creams and skin-lab work, not a one-size injectable in the kitchen.',
    whatItIs:
      'GHK-Cu pairs a GHK tripeptide with copper; it is common in cosmetic and laboratory skin science. Injectable or compounding use is a different legal and risk discussion than a topical.',
    whatItDoes:
      'Work looks at dermal matrix, fibroblasts, and the appearance/behavior of skin in lab and some limited skin studies—usually topical R&D, not a single systemic cure-all.',
    whyUseIt:
      'People and formulators name it for goals like skin texture, fine lines, post-procedure or post-acne look, and sometimes hair or scalp appearance, when they want a peptide or copper angle beyond basic moisturizer. The reason to reach for the topic is almost always appearance- and skin-science–level work, not a substitute for a prescribed drug for a diagnosed disease.',
    regulatoryAndSafety:
      'Cosmetic vs. drug claims depend on intended use and labeling. Disease claims without approval raise FDA issues.',
    learnMoreScience:
      'Mechanisms and data: Literature includes collagen and elastin gene-expression themes, fibroblast behavior, and wound-healing and cosmetic test models. Contrast that with any injectable or systemic claims you may see in forums.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: GHK, copper-peptide, or GHK-copper',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=GHK+Cu+OR+GHK-Cu+OR+%22GHK%20copper%22&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: GHK and skin dermal (cosmetic and lab)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=GHK+peptide+AND+%28dermal+OR+skin+OR+fibroblast%29&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: GHK-copper peptide (GHK-Cu)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=GHK+Cu+peptide+OR+GHK-Cu' },
      { label: 'PubMed: copper peptide + skin OR collagen', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=%22copper+peptide%22+AND+%28skin+OR+collagen%29' },
      { label: 'PubMed: GHK + wound (lab/clinical-skin context)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=GHK+peptide+AND+wound' },
      { label: 'NIH: copper (diet/health, general science)', href: 'https://ods.od.nih.gov/factsheets/Copper-Consumer/' },
    ],
  },
  {
    id: 'cjcipa',
    title: 'CJC-1295 / Ipamorelin',
    pill: 'Research',
    oneLiner: 'Pituitary growth-hormone pulse stimulation in study designs—not “GH in a vial.”',
    vialDisplayName: 'CJC / Ipamorelin',
    summary:
      'People bring up this combo when they are chasing better sleep, recovery, or body composition, and they want a nudge to their own growth-hormone pulses—not a vial of straight hGH. It is a real prescriber and pharmacy rules conversation; the profile has the how-it-works and the search links.',
    whatItIs:
      'CJC-1295 (GHRH-analog class) and ipamorelin (selective growth-hormone secretagogue) are studied to influence pituitary release of growth hormone, not the same as recombinant hGH vials in kind or regulation.',
    whatItDoes:
      'Pharmacology discussion centers on pulses of endogenous growth hormone, somatotrope selectivity, and ghrelin-mimetic secretagogue behavior in controlled research.',
    whyUseIt:
      'In wellness and some sports-medicine conversations, these are raised when the goal is better sleep or recovery, body-composition or strength support in adults, or a perceived alternative to exogenous hGH. Those are the usual reasons the combo is named, and they are also the areas where law and endocrine safety scrutiny are the strongest, so a prescriber must be in the loop.',
    regulatoryAndSafety:
      'hGH and growth-hormone–axis substances are schedule- and compounding sensitive. Do not treat web protocols as safe or legal defaults.',
    learnMoreScience:
      'Mechanisms and data: You will find pharmacology and physiologic-dose work on GH release, IGF-1 kinetics, and somatotrope signaling, plus enforcement and policy text outside PubMed. Compare any study population (for example adults with growth-hormone deficiency) to a general “optimization” use.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: CJC-1295 or “CJC 1295”',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=%22CJC-1295%22+OR+%22CJC+1295%22&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: ipamorelin and growth-hormone axis',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=ipamorelin+AND+%28growth+hormone+OR+somat%29&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: CJC-1295 OR CJC 1295', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=%22CJC-1295%22+OR+%22CJC+1295%22' },
      { label: 'PubMed: ipamorelin (human/animal studies)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=ipamorelin' },
      { label: 'PubMed: GHRH analog + growth hormone', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=GHRH+analog+AND+growth+hormone' },
      { label: 'MedlinePlus: growth hormone (overview)', href: 'https://medlineplus.gov/ency/article/002377.htm' },
      { label: 'DEA/DOJ: human growth hormone (legal context)', href: 'https://www.dea.gov/factsheets/human-growth-hormone' },
    ],
  },
  {
    id: 'semax',
    title: 'Semax & Selank',
    pill: 'Research',
    oneLiner: 'CNS- and attention-adjacent research; international products ≠ U.S. drug approvals.',
    vialDisplayName: 'Semax · Selank',
    summary:
      'These get mentioned when someone wants calmer focus or a clearer head without a hard stimulant, or they saw a product abroad. What you can get and what is safe for you in the U.S. are separate from a foreign label; use the full profile to sort it out.',
    whatItIs:
      'Semax (heptapeptide) and Selank (tuftsin-derivative) are neuropeptides with brand histories in some non-U.S. systems; the U.S. is a different market for approvals and compounding.',
    whatItDoes:
      'Literature and foreign labels associate Semax with alertness, stroke-rehab, or cognitive themes in their jurisdictions; Selank is often associated with anxiolysis- or focus-adjacent discussion in the same neuropeptide bucket.',
    whyUseIt:
      'People name them when the goal is focus, stress tolerance, or mental clarity without a stimulant feel, or when they read about their use in another country. The usual “why” is a desire for non-stimulant cognitive support; U.S. legality, product identity, and psychiatric safety are separate questions a clinician should own.',
    regulatoryAndSafety:
      'Import, compounding, and “nootropic” sales have produced enforcement and product-identity issues. This page does not endorse any non-prescribed source.',
    learnMoreScience:
      'Mechanisms and data: Databases return animal stress models, BDNF-related discussion for Semax, and a smaller human literature base that varies in quality. Compare to controlled trials in ADHD, depression, and anxiety for approved options.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: Semax',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=semax+peptide&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: Selank (also tuftsin-related)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=selank+peptide&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: Semax peptide (human/animal)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=semax+peptide' },
      { label: 'PubMed: Semax + BDNF or cognitive', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=semax+AND+%28BDNF+OR+cognitive%29' },
      { label: 'PubMed: Selank peptide (general)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=selank+peptide' },
      { label: 'PubMed: Selank + anxiety or stress', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=selank+AND+%28anxi+OR+stress%29' },
    ],
  },
  {
    id: 'motsc',
    title: 'MOTS-c',
    pill: 'Research',
    oneLiner: 'Mitochondrial “exercise-mimetic” and metabolic stress—mostly preclinical, not a consumer standard.',
    vialDisplayName: 'MOTS-c',
    summary:
      'This name lands in the same breath as “metabolic fitness,” energy, and healthy aging next to diet and training. A lot of what is published is still early, animal-heavy stuff—the profile pulls in the main science links so you are not relying on a headline.',
    whatItIs:
      'MOTS-c is a peptide encoded in mitochondrial DNA; it is discussed as a retromessenger from mitochondria to the nucleus in metabolic stress biology.',
    whatItDoes:
      'Research often ties it to exercise-like stress responses, AMPK-related themes, and glucose/insulin biology in model organisms—signal transduction, not a vitamin RDA.',
    whyUseIt:
      'The peptide is brought up when someone’s goal is better metabolic “flexibility,” body-composition, or a science-forward “mitochondrial longevity” story alongside diet and training. Those are the motivating reasons in conversation; whether any of that should translate to an individual is not decided by this text.',
    regulatoryAndSafety:
      'Mitochondrial and “longevity” peptides are policy-sensitive. Lists of what 503A pharmacies may prepare change; marketing must not promise outcomes.',
    learnMoreScience:
      'Mechanisms and data: Expect rodent and cell work on stress adaptation, some exercise-mimetic and insulin-sensitivity phenotypes, and a thin human evidence layer relative to the hype. Read for model species and whether outcomes are chronic administration versus acute biology.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed: exercise-induced MOTS-c, aging, and muscle (Nat Commun, 2021)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/33473109/',
      },
      {
        label: 'Peer-reviewed: review of mitochondrial-encoded MOTS-c and related disease context (2023)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/36824008/',
      },
    ],
    learnMore: [
      { label: 'PubMed: MOTS-c', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=MOTS-c' },
      { label: 'PubMed: MOTS-c + mitochondria + muscle', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=MOTS-c+AND+%28mitochondria+OR+muscle%29' },
      { label: 'PubMed: MOTS-c + exercise OR AMPK', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=MOTS-c+AND+%28exercise+OR+AMPK%29' },
      { label: 'PubMed: “mitochondrial derived peptide” family', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=mitochondrial+derived+peptide' },
    ],
  },
  {
    id: 'aod',
    title: 'AOD-9604',
    pill: 'Research',
    oneLiner: 'GH-fragment from older lipolysis research; not a substitute for modern FDA obesity drugs.',
    vialDisplayName: 'AOD-9604',
    summary:
      'It gets dragged into recomposition and fat-loss chats, especially if someone is not on a GLP-1. For a plain-language look at the bigger-name weight drugs, we also have a GLP-1 page; the full profile here covers what the older research was about.',
    whatItIs:
      'AOD-9604 is a fragment of the human growth hormone sequence historically explored in industry and academic metabolic research—not the same as GLP-1 incretin drugs in mechanism or current evidence for obesity.',
    whatItDoes:
      'The old scientific angle was a GH fragment with interest in fat-related endpoints without the full hGH/IGF growth story; modern obesity care more often means GLP-1/GIP, dual agonists, or other approved options.',
    whyUseIt:
      'It appears when someone’s goal is recomposition, spot-reduction, or a “peptide for fat loss” that is not a GLP-1. The reason the name survives in forums is that older marketing and papers tied it to lipolysis. Today, the safer educational message is: compare to approved obesity pharmacotherapy in discussion with a clinician, not a forum stack.',
    regulatoryAndSafety:
      'Body-composition and weight marketing for unapproved actives is an FTC and FDA focus area. We do not state fat-loss results.',
    learnMoreScience:
      'Mechanisms and data: Searches return early trial designs, lipolysis and metabolism endpoints in animals or limited human work, and comparison articles versus hGH. Contrast with modern phase 3 obesity trials for incretins in PubMed and DailyMed for labeled drugs.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: AOD-9604',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=AOD-9604&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: AOD-9604 + fat or lipolysis',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=AOD-9604+AND+%28obes+OR+lip+OR+fat%29&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: AOD-9604', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=AOD-9604' },
      { label: 'PubMed: AOD-9604 + lipolysis OR fat', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=AOD-9604+AND+%28lipolysis+OR+obes%29' },
      { label: 'PubMed: hGH fragment + lipolysis (broad background)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=%22hGH+fragment%22+OR+%22growth+hormone+fragment%22+AND+lip' },
    ],
  },
  {
    id: 'ta1',
    title: 'Thymosin Alpha-1',
    pill: 'Research',
    oneLiner: 'Immunology research and non-U.S. product histories; U.S. compounding and claims are not the same picture.',
    vialDisplayName: 'Thym-α1',
    summary:
      'It is in the mix when the topic is immune “readiness,” getting over a long illness, or what other countries have used in real trials. This page does not turn that into a U.S. DIY protocol—the profile explains the gap between headlines and your doctor’s plan.',
    whatItIs:
      'Thymosin alpha-1 (Ta1) is an immune-modulating peptide; some countries have had injectable product registrations for specific indications, which does not map automatically to U.S. consumer access or compounding.',
    whatItDoes:
      'The science maps to T-cell–related and cytokine-immunology research and certain infectious- or immuno-oncology–adjacent study designs, not a generic “immune boost” in healthy people as an evidence claim.',
    whyUseIt:
      'It is most often named when the goal is immune “readiness,” recovery from infection, or interest in off-label and international use patterns, including comparisons to vaccines and standard therapies. The reason to study the name in education is to separate foreign labels, trial populations, and U.S. compounding law, and to avoid unapproved disease claims.',
    regulatoryAndSafety:
      'Immune-therapy language for unapproved actives is high risk for regulators and for patients who need approved treatments.',
    learnMoreScience:
      'Mechanisms and data: You will see trials and reviews in chronic hepatitis, vaccine responses, and oncology support outside the U.S.; do not conflate a trial population with “wellness” use. Search below for thymic peptides and the named drug where registered.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: thymosin alpha-1 (human focus)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+alpha-1&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: thymosin α1 and hepatitis (historical trials)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+alpha+1+AND+hepatitis&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: thymosin alpha-1 (human + trial)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+alpha-1' },
      { label: 'PubMed: thymosin alpha-1 + hepatitis (historical context)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+alpha-1+AND+hepatitis' },
      { label: 'PubMed: thymosin α1 + vaccine OR immunogenicity', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=thymosin+alpha+1+AND+%28vaccin+OR+immun%29' },
    ],
  },
  {
    id: 'kpv',
    title: 'KPV',
    pill: 'Research',
    oneLiner: 'α-MSH family tripeptide; gut, skin, and colitis *models* in the literature.',
    vialDisplayName: 'KPV',
    summary:
      'A tiny three-letter name people drop when the gut or skin is cranky and they are curious about inflammation calmed from a very small peptide. The animal and dish data are not the same as your care plan; see the full profile and the PubMed list.',
    whatItIs:
      'KPV is a minimal three-amino-acid sequence from the melanocortin/α-MSH signaling family, studied in low-dose, barrier, and anti-inflammatory *models*.',
    whatItDoes:
      'Work explores NF-κB– and inflammatory-cascade–related readouts, epithelial and gut barrier–adjacent effects in preclinical work (models), not a one-size standard of care in humans.',
    whyUseIt:
      'The topic appears when the goal is calmer gut, skin, or IBD-adjacent symptoms with a small peptide, or when people compare “micro-peptides” to their approved anti-inflammatory or biologic drugs. Those patient goals explain the search traffic; the evidence-to-practice gap is what the science links are for.',
    regulatoryAndSafety:
      'IBD, dermatology, and autoimmune care belong under diagnosis-specific therapy; this page does not mirror an internet protocol.',
    learnMoreScience:
      'Mechanisms and data: Searches return colitis, dermatitis, and cell NF-κB and MSH pathway papers. Distinguish transgenic, rodent, and Caco-2–style models from your treating clinician’s plan.',
    peerReviewedPicks: [
      {
        label: 'Peer-reviewed work in PubMed: KPV peptide and inflammation',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=KPV+peptide+OR+%22KPV%22&sort=date',
      },
      {
        label: 'Peer-reviewed work in PubMed: KPV + IBD or colitis (models and studies)',
        href: 'https://pubmed.ncbi.nlm.nih.gov/?term=KPV+AND+%28inflamm+OR+IBD+OR+colitis%29&sort=date',
      },
    ],
    learnMore: [
      { label: 'PubMed: KPV peptide (α-MSH / melanocortin fragment)', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=KPV+peptide' },
      { label: 'PubMed: KPV + NF-kappa B OR colitis', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=KPV+peptide+AND+%28NF-kappa+OR+colitis%29' },
      { label: 'PubMed: KPV + MSH or melanocortin + inflammation', href: 'https://pubmed.ncbi.nlm.nih.gov/?term=KPV+OR+%22Lys-Pro-Val%22+AND+inflamm' },
    ],
  },
]

export function peptideAnchorId(id: PeptideId): string {
  return `peptide-${id}`
}
