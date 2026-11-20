# Dispersion of outcomes across client accounts on the same mandate: standards, regulation and industry practice (SA and UK emphasis)

**Research limitations (read first).** In this session WebFetch could not resolve gipsstandards.org, cfainstitute.org, fca.org.uk or macfarlanes.com (network allow-list), so no primary document was read in full. Every finding below comes from WebSearch result summaries, which cite the URLs given. Exact rule wording, provision numbers, quotes and dates still need checking against the primary documents. Items marked "unverified" are weaker. I found no direct quote from the FCA or FSCA on "dispersion between clients in the same model", and I say so rather than invent one.

## GIPS: internal dispersion

### Takeaway
GIPS requires a composite presentation to include a measure of internal dispersion (variability of individual portfolio returns around the composite return) but does not prescribe which measure. It is not required when the composite has five or fewer portfolios for the full year. Dispersion is the GIPS-level signal of whether accounts managed to one strategy actually got similar results.

### Cited Findings
- GIPS Q&A: firms must present a measure of internal dispersion, and the Standards do not specify which measure; asset-weighted and equal-weighted standard deviation are both acceptable. High/low, range and standard deviation of portfolio returns (equal- or asset-weighted) are options. Source: search summary of GIPS Q&A pages ([GIPS Q&A 467](https://www.gipsstandards.org/?GIPSID=467), [GIPS Q&A 4854](https://www.gipsstandards.org/?p=4854)); Morningstar also lists quartiles as an option ([Morningstar composite dispersion help](https://awgmain.morningstar.com/webhelp/Practice/Composites/Composite_Dispersion_Calculation.htm)).
- Asset-weighted standard deviation is described by Morningstar as the variability of the asset-weighted account return around the asset-weighted mean composite return ([Morningstar](https://awgmain.morningstar.com/webhelp/Practice/Composites/Composite_Dispersion_Calculation.htm)).
- Threshold: a GIPS document says that if the composite contains five or fewer portfolios for the full year, internal dispersion need not be presented (equivalent to "six or more" requiring it). The count is of portfolios in the composite for the whole year, not at year-end. Firms may present it voluntarily below the threshold ([GIPS asset owner comparison](https://dev.gipsstandards.org/wp-content/uploads/2021/02/gips_asset_owners_report_comparison.pdf); [Spaulding Group](https://spauldinggrp.com/standard-deviation-as-internal-and-external-dispersion-when-is-it-required/)).
- Provision numbering: that comparison document cites 4.A.1.i (pre-2020 numbering). One source places the 2020 requirement at 5.A.1.i; I found nothing confirming 5.A.1.e, so check the 2020 text. See [CFA Institute GIPS overview reading 2026](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/overview-of-the-global-investment-performance-standards) (not read).
- Practitioner opinion (not a GIPS rule): one Spaulding Group piece argues asset-weighted dispersion should be dropped ([Spaulding](https://spauldinggrp.com/dispersion-around-exactly-question-worth-pondering/)).
- A related caveat: dispersion is measured only across portfolios in the composite, so accounts excluded for restrictions or size thresholds under the composite definition do not appear (general GIPS composite construction; not confirmed in sources read).

### Inferences
- Low composite dispersion is only meaningful if composite membership rules are not used to exclude awkward accounts. A firm could report tight dispersion while excluded or restricted accounts diverge.
- Dispersion is a backward-looking, annual, composite-level statistic; it does not detect an individual client's persistent shortfall versus the model.

### Gaps
- No GIPS 2020 primary text, exact provision numbers, or CFA Institute guidance wording could be read (fetch blocked).
- No source found giving a "typical" dispersion benchmark level.

## SMA / model portfolio / UMA industry practice (US and UK)

### Takeaway
Dispersion versus the model arises mainly from execution timing, cash flows, account restrictions and holdings overlap, and from slow instruction flow between model provider and sponsor. Providers see it as a reputational and conduct risk. I found no published standard tolerance, and no Morningstar, Envestnet, Vanguard, Northern Trust or PIMFA paper through search.

### Cited Findings
- Charles River: models-based programs can diverge from the SMA strategies they track; it attributes much of this to slow or inaccurate trade-instruction flow between sponsors and managers, and notes back-office systems typically cannot give SMA-centric views of account performance ([Charles River](https://www.crd.com/?p=15861)). Model providers are sensitive to dispersion because of reputational risk (same source).
- Execution timing and position differences open tracking error between a fund and an SMA; funds are passively reweighted by flows while SMAs need active reweighting ([Ralton Asset Management as summarised in search; see also Investor Daily](https://www.investordaily.com.au/managed-funds-being-dressed-up-as-smas)).
- Dimensional: the greater the overlap between a personalised account and its starting strategy, the lower the expected dispersion; it distinguishes realised from ex ante tracking error ([Dimensional](https://www.dimensional.com/us-en/insights/when-it-comes-to-smas-how-do-you-measure-the-impact-of-personalization)).
- Tax-managed SMAs: tracking error is designed; a figure of about 1% is cited as standard and up to about 2% for aggressive loss harvesting. This is Parametric sponsored content, illustrative, not a standard ([InvestmentNews/Parametric](https://www.investmentnews.com/tax-management-and-tracking-error-you-cant-have-one-without-the-other-213056)).
- Rebalancing date alone can produce dispersion: Quantpedia reports roughly 9% relative dispersion for a low-correlation portfolio on yearly rebalancing and 4.6% for a highly correlated one (backtest, not live accounts) ([Quantpedia](https://quantpedia.com/an-analysis-of-rebalancing-performance-dispersion/)).
- Platform mechanics: unexecuted orders can make an account's rebalance fail; an invalid instrument in a model can fail rebalancing for all linked accounts ([Saxo Model Manager FAQ](https://saxopartnerconnect.zendesk.com/hc/en-us/articles/31877703514653-Model-Manager-FAQ)).
- Some firms rebalance larger accounts more often, creating size-driven differences ([Commonwealth](https://www.commonwealth.com/insights/model-portfolios-for-investment-management-the-key-to-efficiency)).
- A sample SMA operations workflow includes reconciling composite to account returns and investigating dispersion outliers ([claudskills SMA skill; low-quality source](https://claudskills.com/skills/managing-separately-managed-accounts/SKILL.md)).

### Inferences
- Two separate buckets need different tolerances: operational dispersion (timing, missed trades, flows) should be tightly policed; intentional dispersion (restrictions, tax, legacy holdings) is a client-agreed deviation that should be disclosed and tracked separately.
- For share portfolios, small accounts and odd-lot rounding will add a size-related dispersion not seen in funds (inference).

### Gaps
- No Morningstar, Envestnet, Vanguard, Northern Trust or PIMFA/WMA paper on dispersion was found. No source for a typical acceptable tolerance band for operational dispersion.

## UK FCA

### Takeaway
No FCA text found that specifically names dispersion between clients on the same model. The relevant hooks are the Consumer Duty (outcomes monitoring, distribution-chain responsibility), suitability for discretionary management, fair order allocation (COBS 11.3), and the live FCA multi-firm review of model portfolio services (MPS). Findings of that review are not yet published in anything I found.

### Cited Findings
- FCA DP25/3 (December 2025): no formal regulatory definition of "model portfolio"; it distinguishes managed (discretionary, rebalanced, full suitability) from static portfolios, and asks whether outcomes-based rules should apply to MPS firms (investment powers, liquidity, fair treatment). Consultation question, not a rule ([DP25/3](https://www.fca.org.uk/publication/discussion/dp25-3.pdf)). An earlier discussion paper asked whether consistent rules should apply to funds and individual portfolios (per search summary, unverified).
- FCA MPS multi-firm review: announced February 2025; the March 2026 Regulatory Priorities report said it would progress in 2026. The information request covers portfolio construction, adherence to mandate, and risk management and oversight ([Macfarlanes](https://www.macfarlanes.com/insights/102khcq/are-the-storm-clouds-gathering-for-mps-providers/); [Financial Planning Today](https://financialplanningtoday.co.uk/news/fca-to-review-mps-consumer-duty-compliance); [FCA FOI annex](https://www.fca.org.uk/publication/fca/foi2026_01264-annex-a.pdf)). One consultancy claims findings of patchy practice; unconfirmed ([Wealth Analytica](https://wa-website-live.pages.dev/insights/consumer-duty-mps-firms-fca-review/)).
- Consumer Duty: practitioner guidance says a discretionary manager running a model portfolio is a manufacturer owning target market, fair value and outcomes monitoring, and must consider end-client outcomes even without a direct relationship; Duty asks firms to monitor outcomes, not activity ([Wealth Management Professionals](https://wealthmanagementprofessionals.co.uk/insights/regulation-compliance/consumer-duty-for-discretionary-fund-managers)). Secondary source; verify against PRIN 2A and FG22/5.
- Upper Tribunal (Westbury/Synergy chain): a discretionary manager owed suitability duties to end investors and could not contract out of them ([Mondaq](https://webiis08.mondaq.com/uk/financial-services/1761730/uk-upper-tribunal-decision-on-obligations-of-those-in-investment-management-distribution-chains)).
- COBS 11.3: aggregation of client orders is allowed only if the firm has and applies an order allocation policy providing for fair allocation (volume, price, partial fills) ([FCA Handbook COBS 11.3](https://www.handbook.fca.org.uk/handbook/COBS/11/3.html)). This is the most direct rule on identical trades producing different outcomes across clients.
- Consolidation multi-firm review covered groups with discretionary management and advice propositions (centralised proposition context) ([Regulation Tomorrow](https://www.regulationtomorrow.com/2025/11/fca-multi-firm-review-on-consolidation-in-the-financial-advice-and-wealth-management-sector/)); details not read.
- Russell Investments (January 2026) commentary on MPS and Consumer Duty ([Russell](https://russellinvestments.com/content/ri/uk/en-gb/insights/russell-research/2026/01/MPS-Solutions-Comply-with-Consumer-Duty.html)): not read in full.

### Inferences
- A manager whose clients on one model show unexplained spread would struggle to evidence Consumer Duty outcomes monitoring (consumer understanding, price and value, products and services) at the cohort level; dispersion analytics are a natural monitoring input (inference, not an FCA statement).
- COBS 11.3 allocation fairness is the clearest existing legal hook for operational dispersion.

### Gaps
- No FCA quote on consistency across clients in the same model, on CIPs and outcome testing, or on COBS 9A in this context. COBS 9A and FG22/5 text not retrieved. Thematic review references (e.g. on CIPs) not found.
- FCA domain was unreachable, so no verbatim quotes.

## South Africa: FSCA / FAIS

### Takeaway
Search found no FSCA communication specifically about dispersion between discretionary or model-portfolio clients. The framework is FAIS (Category II discretionary FSPs, fit and proper determination in BN 194), TCF principles to be formalised by the COFI Bill, and a 2019 Retail Distribution Review (RDR) discussion document that flagged model portfolio managers.

### Cited Findings
- Board Notice 194 of 15 December 2017 (Determination of Fit and Proper Requirements) has a Category II section (s18), amended by Government Notice 707 of 26 June 2020; Category II covers discretionary FSPs per the Discretionary Code of Conduct. Representatives need a recognised qualification; Category II FSPs have regulatory exam and experience requirements (details in tables not retrieved) ([Law Library BN 194](https://lawlibrary.org.za/akn/za/act/bn/2017/194/eng@2020-06-26/source); [gov.za BN 194](https://www.gov.za/sites/default/files/gcis_document/201712/41321bn194.pdf); [Moonstone](https://www.moonstone.co.za/fit-proper-qualification-requirements/)).
- COFI Bill: published December 2018, comments to 1 April 2019; meant to formalise TCF and would cover FSPs, banks, insurers, credit providers and discretionary fund managers ([FA News](https://www.fanews.co.za/article/intermediaries-brokers/7/general/1227/what-financial-advisers-need-to-know-about-the-cofi-bill/36749); [Werksmans](https://werksmans.com/conduct-of-financial-institutions-bill/)). Current status unconfirmed; appears still not enacted as of search.
- FSCA's CIS manager Conduct Standard is described as interim pending the COFI framework ([FA News](https://www.fanews.co.za/article/compliance-regulatory/2/general/1082/fsca-publishes-new-conduct-standard-for-collective-investment-scheme-managers/42304)).
- RDR Discussion Document on investment matters (2019): model portfolio manager and co-branded arrangements needed closer look; the broad discretionary FSP definition does not ensure a meaningful, value-adding service; proposed a distinct licence category for model portfolio providers. Discussion document, not final ([Moonstone copy](https://www.moonstone.co.za/wp-content/uploads/library/Moonstone%20Library/MS%20Industry%20News/1.%20Retail%20Distribution%20Review_Discussion%20Document%20on%20Investment%20Related%20Matters%202019.pdf)).

### Inferences
- TCF Outcome 6 (no post-sale barriers) and Outcome 5 (products perform as expected) are the natural fit for dispersion, but I did not retrieve the TCF text in this session, so that mapping is from background knowledge and unverified.

### Gaps
- No FSCA notice on DFMs or model portfolios, no Discretionary FSP Code of Conduct text on consistent treatment, no ASISA paper on dispersion, no confirmation of COFI Bill's current status or the latest draft. FSCA domain not queried directly.

## Enforcement, complaints, reputational examples

### Takeaway
No case found where a regulator acted purely because clients on the same strategy had different returns. The nearest precedents concern unfair trade allocation between clients, which is the deliberate form of dispersion.

### Cited Findings
- Aviva Investors Global Services (FCA final notice, 2015, per search): fined £17.6m (30% settlement discount; £25.15m before) for failing to organise and control its affairs and manage conflicts fairly. Fixed-income traders delayed booking trades ("cherry picking") and allocated favourable ones to funds paying performance fees, Aug 2005 to Nov 2012; Aviva paid £132m compensation ([FCA final notice](https://www.fca.org.uk/publication/final-notices/aviva-investors.pdf); [FCA press release](https://www.fca.org.uk/news/press-releases/fca-fines-aviva-investors-%C2%A3176m-systems-and-controls-failings-led-its-failure)). Date taken from search summary; confirm on the notice.
- Savoy Investment Management (FSA): fined £412,000 for suitability failings with wide manager discretion ([Professional Adviser](https://www.professionaladviser.com/news/2224356/savoy-investment-management-fined-gbp412k-unsutiable-advice)). Charterhouse Consulting (FSA): £122,500 for switching clients between funds without permission ([Professional Adviser](https://www.professionaladviser.com/news/1336805/fsa-fines-charterhouse-consulting-gbp122-500)). Both are loosely related, not dispersion cases.

### Inferences
- Reputational risk of unexplained dispersion is asserted by vendors (Charles River) but I found no documented complaint or Ombudsman case.

### Gaps
- No South African enforcement or FAIS Ombud examples searched or found. No Financial Ombudsman Service decisions on same-model differences found.
