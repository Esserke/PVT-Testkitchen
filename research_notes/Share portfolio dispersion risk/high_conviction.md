# High-conviction / concentrated "best ideas" share portfolios and the dispersion of their outcomes

Method note: only WebSearch result summaries were usable. Direct fetches of primary PDFs (LSE, NBER, RePEc, UCT, evidenceinvestor) failed because those hosts are not in the session's allowed network domains, so most figures below come from search-engine summaries of the papers, not the papers' own tables. Each such figure is flagged "secondary". Verify before client-facing use. The tracking-error arithmetic in section 5 is my own calculation and carries no external source.

## 1. Cohen, Polk & Silli (2010), "Best Ideas": findings on highest-conviction positions

### Takeaway
Managers' highest-conviction stocks beat the market and the rest of their own portfolios by roughly 2.8-4.5% a year, while most other holdings show no significant alpha. The authors' explanation is that managers dilute best ideas for risk and tracking-error reasons. A later hedge-fund replication found best ideas were no better than the rest.

### Cited Findings
- Abstract (as quoted by a secondary source): stocks in which active mutual fund and hedge fund managers show most conviction outperform the market and the managers' other stocks by approximately 2.8 to 4.5 percent per year, depending on the benchmark — [Hedge Fund Alpha summary](https://hedgefundalpha.com/?p=1201117); the same range is given on [HBS Working Knowledge](https://hbswk.hbs.edu/item/best-ideas) and [CXO Advisory](https://www.cxoadvisory.com/investing-expertise/best-ideas-of-mutual-fund-managers/) (all secondary).
- LSE presentation slides by Polk give 1.2 to 2.6 percent per quarter outperformance for the primary tests (via search summary, secondary; I could not open the slides) — [LSE slides](https://www.lse.ac.uk/Events/Events-Assets/PDF/2017/2017-LT01/20110224-Christopher-Polk-Best-Ideas.pdf).
- The vast majority of managers' other holdings do not show significant outperformance. The typical manager has a few good ideas with positive expected alpha, and the rest contribute little or none (secondary) — [Hedge Fund Alpha](https://hedgefundalpha.com/?p=1201117); paper at [LSE](https://personal.lse.ac.uk/polk/research/BestIdeas.pdf).
- Why funds dilute: holding only a few names would raise volatility (tracking error), so managers have incentives to add zero-alpha positions (secondary) — [Hedge Fund Alpha](https://hedgefundalpha.com/?p=1201117).
- Best ideas are mostly unique: over 70% are the best idea of only one manager. The best ideas of small funds reportedly beat those of large funds by 15% a year (secondary, via search summary) — [CXO Advisory](https://www.cxoadvisory.com/investing-expertise/best-ideas-of-mutual-fund-managers/).
- Best idea = the stock with the highest portfolio tilt versus a benchmark-weight reference (secondary) — [LSE research online](https://researchonline.lse.ac.uk/id/eprint/24471).
- Critique: a study of hedge funds (Epsilon) found best ideas earned statistically significant alpha, but only at about the same rate as the rest of the portfolios — [Bloomberg Quint](https://www.bloombergquint.com/markets/hedge-funds-best-ideas-no-better-than-the-rest-of-their-ideas); [Hedgeweek](https://hedgeweek.com/news/hedge-funds-best-ideas-are-not-holy-grail-performance). Popular claims of "up to 20% a year" come from blogs, not the paper, and should not be used.

### Inferences
- The paper's alpha is an average across many managers' top picks. It says nothing about how one manager's single best idea will do in a given year, so single-portfolio outcomes still vary widely.
- Over 70% uniqueness of best ideas implies different advisers or managers will hold very different top picks, which is the mechanism for cross-client dispersion.

### Gaps
- Exact sample (years, number of funds), t-statistics and per-position weights not verified because primary PDF was unreachable.
- Best-idea results are measured on holdings data, so they are gross of fees and trading costs.

## 2. Active share: Cremers & Petajisto (2009), Petajisto (2013), and critiques

### Takeaway
High-active-share funds, especially concentrated stock pickers, beat benchmarks net of fees in the original US sample (to 2009), with persistence. Later work (AQR, Morningstar) says the effect is largely a benchmark-type artefact and faded after about 2010. Evidence on spread between funds within the high-active-share group was not found in a citable form.

### Cited Findings
- Cremers & Petajisto (2009, Review of Financial Studies 22(9)), "How Active Is Your Fund Manager?": funds with the highest Active Share significantly outperform benchmarks both before and after expenses and show strong persistence; funds with Active Share of about 20-60% were significantly less likely to outperform (secondary) — [RePEc](https://econpapers.repec.org/RePEc:oup:rfinst:v:22:y:2009:i:9:p:3329-3365); [Yale working paper](https://depot.som.yale.edu/icf/papers/fileuploads/2370/original/06-14.pdf).
- Petajisto (2013, Financial Analysts Journal 69(4)), "Active Share and Mutual Fund Performance": classifies funds by Active Share and tracking error. Stock pickers (high Active Share, higher tracking error) and concentrated funds outperform; closet indexers (lowest Active Share) persistently underperform despite low fees. Closet indexing has grown since 2007 and covers about one-third of mutual fund assets (secondary) — [CFA Institute](https://www.cfainstitute.org/en/research/multimedia/2014/active-share-and-mutual-fund-performance); [FAJ via econpapers](https://econpapers.repec.org/RePEc:taf:ufajxx:v:69:y:2013:i:4:p:73-93).
- A search summary reports stock pickers at 1.89% a year versus -1.07% for closet indexers over 1990-2009 (net of fees, per that summary; not verified against the paper) — [ThinkAdvisor](https://www.thinkadvisor.com/2013/07/01/why-hyperactively-managed-funds-outperform/). A guessed set of other figures (1.26%, -0.91%) I tried to confirm was NOT found and is not used.
- Petajisto notes the data do not show that every high-Active-Share manager outperforms; commentary stresses the result is an average (secondary) — [CBS News](https://www.cbsnews.com/news/has-a-way-to-find-the-best-performing-managers-been-found).
- Critique: Frazzini, Friedman & Pomorski (2016, FAJ 72(2), 14-21), "Deactivating Active Share": high-active-share funds tend to have small-cap benchmarks and low-active-share funds large-cap ones, so sorting on Active Share is mostly sorting on benchmark type. Within a given benchmark they find no reliable evidence that high-active-share funds earn higher returns. Active share may be useful for judging fees — [CFA Institute RPC](https://rpc.cfainstitute.org/research/financial-analysts-journal/2016/deactivating-active-share); [RePEc](https://econpapers.repec.org/RePEc:taf:ufajxx:v:72:y:2016:i:2:p:14-21).
- Morningstar's 2021 "Unattractive Share" paper is reported to find the Active Share premium reversed after 2010 (secondary claim, not verified) — [Morningstar Australia](https://www.morningstar.com.au/funds/how-passive-investing-is-driving-decline-active-fund-alpha).

### Inferences
- Active share is a statement about how different a portfolio is from the index, not about skill; the same difference drives both upside and downside dispersion.
- Active share evidence supports "average concentrated manager beat in 1990-2009" but is weak support for a forward-looking claim about any specific portfolio.

### Gaps
- Tracking error levels and cross-fund dispersion (best versus worst stock-picker) from Petajisto's tables were not retrievable.
- Persistence figures for individual funds not obtained.

## 3. Concentrated funds: performance and dispersion

### Takeaway
Average results for concentrated funds are modestly better in several studies (Kacperczyk et al., Yeung et al.), but dispersion rises with concentration and Morningstar finds the average benefit is not reliable. Concentration widens the gap between best and worst.

### Cited Findings
- Kacperczyk, Sialm & Zheng (2005, Journal of Finance 60(4), 1983-2011), industry concentration, US funds 1984-1999: above-median industry-concentration funds earned abnormal returns of 1.58% a year before expenses and 0.33% after; the below-median funds about 0.36% before and -0.77% after per working paper (secondary summary). Spread of about 1.1% after expenses is arithmetic from those two figures and mixes published and working-paper versions. Other versions give different figures (e.g., 0.82% after expenses in a 2003 press release) — [NBER w10770](https://www.nber.org/papers/w10770.pdf); [RePEc](https://econpapers.repec.org/RePEc:bla:jfinan:v:60:y:2005:i:4:p:1983-2011); [Michigan press release](https://news.umich.edu/concentrated-mutual-funds-perform-better-michigan-business-school-study-shows).
- Yeung, Pellizzari, Bird & Abidin (2012, working paper), "Diversification Versus Concentration... and the Winner Is?": using US equity mutual funds, concentrated portfolios built from managers' own stock preferences outperform diversified ones; managers' stock-picking skill may be lost in portfolio construction. Investors can diversify across concentrated funds instead of relying on funds to diversify — [RePEc](https://ideas.repec.org/p/uts/pwcwps/18.html); [Bank Syz summary (marketing)](https://blog.syzgroup.com/slow-food-for-thought/diversification-versus-concentration.-and-the-winner-is-).
- An Alphatheory summary reports concentrated portfolios (US equity under 30 positions; small-cap and EAFE under 40) added 100-170 bps over non-concentrated, but it does not clearly tie this to Yeung et al., and does not state the period or annualisation. Do not attribute to Yeung et al. — [Alphatheory](https://alphatheory.com/blog/new-data-on-portfolio-concentration).
- Morningstar UK (2004), funds with 40 or fewer equity holdings, 18 funds with three-year histories: five in top quartile, six in bottom quartile; best three-year return 12.56%, worst -26.25% (small, old sample, illustrative only) — [Morningstar UK](https://morningstar.co.uk/uk/news/59486/the-truth-about-focus-funds.aspx).
- Morningstar US focus funds study (10% of funds with the fewest holdings): concentration accentuates the gap between best and worst — [Morningstar UK summary](https://www.morningstar.co.uk/uk/news/198874/do-concentrated-portfolios-perform-better.aspx).
- Morningstar report (January 2026): highly concentrated funds show wider return dispersion, deeper drawdowns and higher volatility, and have generally been somewhat lower-returning than diversified peers (via search summary; I did not open the PDF) — [Morningstar Bold Portfolios PDF](https://www.morningstar.com/content/cs-assets/v3/assets/blt9415ea4cc4157833/bltafd1db2d7e732e54/6979d7134e0a2a440faf88cd/Bold_Portfolios_27012026_1.pdf).
- Tidmore study of US funds 1999-2020: higher concentration hurt poor performers more than it helped good ones (secondary) — [Evidence Investor](https://www.evidenceinvestor.com/the-role-of-concentration-in-fund-performance).
- Acadian argues the apparent benefit of concentration reflects overconfident managers and survivorship bias — [Acadian](https://www.acadian-asset.com/investment-insights/equities/concentrated-equity-standing-out-but-not-outstanding).
- Fama & French (2010, Journal of Finance), "Luck versus Skill": the aggregate active US fund portfolio is close to the market and costs show up as lower investor returns; few funds produce enough benchmark-adjusted return to cover costs; extreme tails appear more often than in no-skill simulations, so some skill and some negative skill exist. Harvey & Liu (2022) argue the bootstrap understates outperformers — [Fama-French PDF (Dartmouth course copy)](https://mba.tuck.dartmouth.edu/bespeneckbo/default/AFA611-Eckbo%20web%20site/AFA611-S8C-FamaFrench-LuckvSkill-JF10.pdf); [Harvey-Liu, JF 2022](https://econpapers.repec.org/RePEc:bla:jfinan:v:77:y:2022:i:3:p:1921-1966).

### Inferences
- The consistent message across sources: concentration increases the width of outcomes more than it shifts the average. Mean advantage is about 1-2% a year at best in the favourable studies, versus dispersion several times larger.
- Fama-French implies that, absent skill, a set of concentrated advisers' portfolios would spread by luck alone, with costs pulling the whole distribution down.

### Gaps
- I did not find a clean published figure for the interquartile or best-minus-worst gap among concentrated funds (US) beyond the small Morningstar UK example.
- Baks, Busse & Green (2006) were not searched; no figures included.

## 4. Individual investors and advisers picking stocks

### Takeaway
Individual and household stock portfolios are typically very thin (median about 3 stocks in Barber-Odean's sample; averages of roughly 4-7 cited secondarily) and bear a diversification cost, mostly from idiosyncratic risk. I found no good public study of adviser-picked model portfolios.

### Cited Findings
- Barber & Odean (2000, Journal of Finance 55(2), 773-806): 66,465 households at a large discount broker, 1991-96; gross returns roughly matched the market but net returns lagged due to trading costs; turnover about 75% a year — [RePEc](https://econpapers.repec.org/RePEc:bla:jfinan:v:55:y:2000:i:2:p:773-806); [Odean page](https://faculty.haas.berkeley.edu/odean/papers/returns/returns.html).
- Barber and Odean describe their investors as undiversified; in a typical month the median investor held three common stocks (authors' own commentary as reported in a summary; median not average) — [Turtle Trader summary](https://www.turtletrader.com/overconfident/).
- Goetzmann & Kumar (2008, Review of Finance 12(3), 433-463), "Equity Portfolio Diversification": more than 40,000 discount-brokerage accounts, 1991-96; the number of stocks held rose over the period, lowering average variance; investors understand diversification but implementing it is hard — [NBER w8686](https://www.nber.org/papers/w8686.pdf); [RePEc](https://econpapers.repec.org/RePEc:oup:revfin:v:12:y:2008:i:3:p:433-463).
- A Vanguard paper, citing Barber & Odean (2001) and Goetzmann & Kumar (2008), says average holdings at a large discount broker ranged from four to seven stocks (secondary; not confirmed against the originals) — [Vanguard](https://www.vanguard.co.uk/content/dam/intl/europe/documents/en/what-is-a-mutual-fund-worth.pdf).

### Inferences
- Individual investors' evidence is about self-directed accounts, not advisers. It tells us the idiosyncratic-risk cost of holding few names, which is the same mechanism that creates dispersion between clients of a multi-adviser share model.

### Gaps
- Return cost of underdiversification (e.g., Goetzmann-Kumar's estimated annual loss) not obtained; primary text unreachable.
- No study found of adviser-picked or broker-recommended portfolios' dispersion. Luck-versus-skill evidence is for fund managers (Fama & French), not advisers.

## 5. Tracking error and the range of 1-year outcomes (own calculation, no external source)

### Takeaway
Assuming roughly normal active returns, about 95% of one-year relative results fall within +/-2 tracking errors (6% TE: +/-12%; 8%: +/-16%; 10%: +/-20%). Two clients with independent portfolios of the same TE can differ by far more. A 30-point gap (+18% versus -12%) is a 2.1-sigma event for a pair of independent 10% TE portfolios and a very rare one at 6%.

### Cited Findings
- None external; Python calculation below. Assumptions: normal distribution, zero mean alpha, each portfolio's active return independent of the other (different stock picks), same benchmark, TE as annualised standard deviation.

| TE vs benchmark | 1-sd relative | ~95% range (+/-1.96 sd) | sd of difference between two independent portfolios (TE x 1.414) | ~95% range of the gap between two portfolios | Chance the two differ by 30 points or more |
|---|---|---|---|---|---|
| 6% | +/-6% | +/-11.8% | 8.5% | +/-16.6% | about 0.04% |
| 8% | +/-8% | +/-15.7% | 11.3% | +/-22.2% | about 0.8% |
| 10% | +/-10% | +/-19.6% | 14.1% | +/-27.7% | about 3.4% |

- Worked mapping: if the benchmark returns +3% in a year, a 10% TE portfolio ends between about -17% and +23% with 95% confidence; a +18% versus -12% spread across two clients means relative results of roughly +15 and -15, each about 1.5 TE at 10% TE. Such a pair is not a freak outcome among many portfolios: with, say, 50 independent clients at 10% TE, the best and worst are expected to be around +/-2.2 sd apart from the mean, a range of about 44 points (expected extreme of 50 normal draws is about 2.25 sd; approximation).
- A single, centrally run high-conviction model has one active return stream: all clients see the same relative result (apart from implementation timing). Adviser-by-adviser picking produces N streams, so the cross-client spread adds to the benchmark-relative risk each client already carries. Average client outcomes in both set-ups are the same only if skill is equal.
- Fund-level TE for stock-picker categories was not obtainable from the sources, so the 6-10% range is the brief's assumption, not a sourced estimate.

### Inferences
- Tracking error means the risk to a client of "being different" is symmetric, but the adviser-level relationship risk (a client comparing outcomes with another client) is a pair-wise measure that grows by the square root of 2.
- Real distributions have fat tails and common-factor (style) exposures, so the independence assumption may understate or overstate the spread depending on whether advisers share style tilts.

### Gaps
- No empirical distribution of one-year relative returns for concentrated portfolios was sourced.

## 6. South African evidence on concentrated / high-conviction managers

### Takeaway
Little public SA evidence was found. A UCT thesis reports concentrated stock pickers had higher alpha than closet indexers in SA general equity unit trusts. A 2015 Prescient piece suggests concentration hurt in low-dispersion conditions.

### Cited Findings
- UCT thesis on SA general equity unit trusts: those with the highest Active Share and tracking error (concentrated stock pickers) earned significantly higher alpha than those with the lowest (closet indexers). Author, year and figures not retrieved (thesis, not peer reviewed; from search summary) — [UCT repository](https://open.uct.ac.za/server/api/core/bitstreams/1b38b353-f799-4ec0-b0ec-7247cb6831bf/content).
- Prescient's Daniel Polakow (2015, press coverage): low stock dispersion materially affected fund returns, and managers who raised concentration to stand out were among the hardest hit (secondary press) — [Moonstone](https://www.moonstone.co.za/?p=62626) (search listing; I did not verify this page contains the Polakow quote).
- JSE is highly concentrated, which limits the opportunity set for long-only managers (Raubenheimer, South African Journal of Business Management) — [SAJBM](https://sajbm.org/index.php/sajbm/article/view/526).
- Taljaard & Maré (2021, Investment Analysts Journal 50(1), 32), why equal-weighted portfolios have not worked in South Africa: tangential, no concentration figures — see SAJBM reference list at [SAJBM](https://sajbm.org/index.php/sajbm/article/view/526).
- Alexforbes Manager Watch reports significant dispersion between managers behind strong headline returns (no figures obtained) — [Alexforbes via Moonstone](https://www.moonstone.co.za/manager-watch-strong-year-weaker-long-term-outlook/).

### Inferences
- A concentrated SA large-cap portfolio is already constrained by index concentration, so stock-specific tracking error from a few-name portfolio would sit on top of a large common-factor (resources, Naspers/Prosus-type) exposure; this is an inference, not a sourced finding.

### Gaps
- No peer-reviewed SA study of high-conviction manager dispersion found; no SA figures for best-versus-worst concentrated funds; no SA study of adviser-picked share portfolios. Would need Morningstar SA / local manager data directly (Morningstar MCP tools are available but were not used here).
