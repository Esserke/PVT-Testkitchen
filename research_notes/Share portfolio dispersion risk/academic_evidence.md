# Academic evidence on dispersion of returns in concentrated share portfolios, by number of stocks

Method note: arxiv.org, cxoadvisory.com and investec.com could not be fetched (network allowlist / 403), and most journal PDFs are paywalled. Nearly every figure below comes from web-search result summaries, not from the original full text. Treat each figure as "secondary, unverified against original" unless stated. Several of the requested figures (Evans & Archer, Fisher & Lorie annual ranges, Surz & Price terminal wealth, Domian et al. terminal wealth percentiles, JSE-specific dispersion) were NOT found; see Gaps.

## 1. What the classic US studies find about dispersion by number of stocks

### Takeaway
The classic studies agree that dispersion of outcomes falls quickly up to roughly 8-20 stocks, then slowly; later work (Statman 1987, Surz & Price, Domian et al.) argues 30 to 100+ stocks are needed once the goal is reducing shortfall risk rather than variance alone. I could not retrieve the actual dispersion ranges (e.g. best vs worst outcome by N) for any of these papers.

### Cited Findings
- Evans & Archer (1968), "Diversification and the Reduction of Dispersion: An Empirical Analysis", Journal of Finance: commonly summarised as finding that the benefits of diversification are "virtually exhausted when a portfolio contains approximately ten stocks" (quote from a citing paper, via search summary) — [de Vries paper citing it](https://webarchive.ucr.edu/economics.ucr.edu/wp-content/uploads/2019/10/de-Vries-paper-2-for-5-29-13-seminar.pdf); catalogue record only for the paper itself: [libmast.utm.my](https://libmast.utm.my/Record/KOHA-OAI-TEST:327351/Details). A secondary summary says risk reduction "tapered off at roughly 10 to 15 stocks" (secondary, via search summary).
- Fisher & Lorie (1970), "Some Studies of Variability of Returns on Investments in Common Stocks", Journal of Business 43(2): 99-134 ([RePEc record](https://econpapers.repec.org/RePEc:ucp:jnlbus:v:43:y:1970:i:2:p:99-134)). A widely reproduced table gives the percent of possible reduction in dispersion achieved: 2 stocks 41%, 8 stocks 82%, 16 stocks 90%, 32 stocks 95%, 128 stocks 99%, full market 100%. Source of table: secondary summary surfaced in search, not verified against original — see [Surz & Price PDF on typeset.io](https://typeset.io/pdf/the-truth-about-diversification-by-the-numbers-584p2309i3.pdf) and [Benjelloun 2010](https://businessperspectives.org/images/pdf/applications/publishing/templates/article/assets/3162/imfi_en_2010_01_Benjelloun.pdf) as the places the search surfaced this. One practitioner critique argues 15-stock portfolios achieve only 75-80% of available diversification (practitioner view, single source).
- Statman (1987), "How Many Stocks Make a Diversified Portfolio?", JFQA 22(3): 353-363. Abstract: a well-diversified random portfolio must include at least 30 stocks for a borrowing investor and 40 for a lending investor; benchmark was a 500-stock portfolio and argues Evans & Archer's ~10-stock conclusion is wrong — [Cambridge Core](https://cambridge.org/core/journals/journal-of-financial-and-quantitative-analysis/article/how-many-stocks-make-a-diversified-portfolio/CE5CDF2C7225FC1E0EDE3E700A3C66A7); [IDEAS](https://ideas.repec.org/a/cup/jfinqa/v22y1987i03p353-363_01.html). Critique: Shanker (1989) found conclusions depend on benchmark size and transaction costs (via a UGA review summary, secondary).
- Statman (2004), "The Diversification Puzzle", Financial Analysts Journal 60(4): 44-53. Abstract: optimal diversification under mean-variance theory exceeds 300 stocks, while the average investor holds only 3 or 4; the puzzle is explained with behavioral portfolio theory — [CFA Institute RPC](https://rpc.cfainstitute.org/en/research/financial-analysts-journal/2004/the-diversification-puzzle); [IDEAS](https://ideas.repec.org/a/taf/ufajxx/v60y2004i4p44-53.html). Full text not read; no dispersion table retrieved.
- Surz & Price (2000, working paper dated 30 Oct 1999), "The Truth About Diversification by the Numbers": challenges the claim that 30 stocks capture 95% of diversification. Secondary summaries: average random 30-stock portfolio achieves only ~85% of possible diversification; 60 stocks ~88%. Tracking error table: optimised selection 4.2 vs random selection 6.2 at 30 stocks (units presumably % tracking error; unconfirmed) — [typeset.io copy of paper](https://typeset.io/pdf/the-truth-about-diversification-by-the-numbers-584p2309i3.pdf). Journal citation (Journal of Investing) not verified.
- Domian, Louton & Racine (2007), "Diversification in Portfolios of Individual Stocks: 100 Stocks Are Not Enough", Financial Review 42(4): 557-570. Random portfolios drawn from 1,000 large US stocks, 20-year holding periods; shortfall risk (probability of failing to reach a return goal) keeps falling beyond 100 stocks; industry diversification helps slightly but increasing stock count helps more; replicating 1965-1984 reinforced the finding. Textbook 8-20 stocks "may be insufficient for long-term investors" — [IDEAS](https://ideas.repec.org/a/bla/finrev/v42y2007i4p557-570.html); [CXO Advisory summary (secondary, search snippet only)](https://www.cxoadvisory.com/?p=776). Note the paper's own title/abstract focuses on shortfall probability, not annual return ranges.
- Australian paper (Alexeev & Tapon, 2013 working paper, UTS/Tasmania): on average 24-30 stocks gives 90% reduction in diversifiable risk (journal unconfirmed) — [UTS PDF](https://opus.lib.uts.edu.au/bitstream/10453/117055/1/JAS2013N04_014.pdf) (search summary only).

### Inferences
- The "8/16/32 stocks gets you 82/90/95% of the way" tables measure reduction in dispersion relative to a single stock, not absolute outcome ranges, so they understate how wide absolute 1-year outcomes remain for 10-20 stock portfolios (the dispersion that remains is the tail the client conversation is about). This is my reading, not a finding from the papers.
- The 10-vs-30-vs-100+ disagreement is largely a difference in the target (variance reduction vs shortfall/terminal-wealth probability vs benchmark size).

### Gaps
- Actual best/worst/percentile terminal wealth ratios by N for Evans & Archer, Fisher & Lorie (they reported wealth-ratio distributions), and Domian et al. (shortfall probabilities by N) were not retrieved; full texts paywalled.
- Surz & Price headline numbers are from secondary summaries; the original table should be read.
- Statman 2004 full text not read.

## 2. Skewness: Heaton, Polson & Witte and Bessembinder

### Takeaway
Single-stock returns are so right-skewed that most stocks lose to cash over their lives and a tiny fraction of stocks generates all net wealth; so a small random subset has a median return below the index and a higher chance of underperformance, even though a few subsets do very well.

### Cited Findings
- Bessembinder (2018), "Do Stocks Outperform Treasury Bills?", Journal of Financial Economics: ~58% of US stocks failed to beat one-month T-bills over their lifetimes (1926-2016); all net wealth creation above T-bills (~$35 trillion) came from 1,092 companies, 4.3% of nearly 26,000 stocks; remaining stocks collectively matched T-bills — [ASU W. P. Carey page](https://wpcarey.asu.edu/department-finance/faculty-research/do-stocks-outperform-treasury-bills); [Morningstar](https://www.morningstar.com/personal-finance/hendrik-bessembinder-do-stocks-outperform-treasury-bills) (summaries via search; "38% beat T-bills by moderate amounts" also reported).
- Bessembinder, Chen, Choi & Wei (2023), "Long-Term Shareholder Returns: Evidence from 64,000 Global Stocks", Financial Analysts Journal 79(3): 33-63: more than 64,000 stocks, 1990-2020; 55.2% of US stocks and 57.4% of non-US stocks underperform one-month US T-bills; the top 2.4% of stocks account for all net global wealth creation — [CFA Institute](https://rpc.cfainstitute.org/research/financial-analysts-journal/2023/long-term-shareholder-returns-evidence-from-64000-global-stocks); [Morningstar Australia](https://www.morningstar.com.au/stocks/only-2-4-of-companies-deliver-all-net-shareholder-wealth) (title only seen).
- A 1926-2023 update covering over 29,000 US stocks exists (reported in a search summary; figures not retrieved).
- Heaton, Polson & Witte (2017), "Why Indexing Works", Applied Stochastic Models in Business and Industry 33(6): 690-693 (arXiv 1510.03550): a small random subset of an index sharply raises the chance of underperforming the index; because the best stocks do much better than the rest, in their five-stock example the median return of a random selection is worse than the full-index average; authors argue relative underperformance likelihood matters more than the fee drag — [arXiv abstract](https://arxiv.org/abs/1510.03550); [IDEAS](https://ideas.repec.org/a/wly/apsmbi/v33y2017i6p690-693.html). Note: the paper does NOT claim random portfolios outperform. Specific probabilities by N were not retrieved (arXiv fetch blocked).

### Inferences
- Because the mean of a skewed distribution exceeds its median, a typical (median) 10-20 stock portfolio trails the index while a minority beat it by a lot, producing the +18% / -12% type of client spread with no skill difference. Consistent with the cited mechanism; the specific magnitude is not quantified in retrieved sources.

### Gaps
- Heaton et al.'s numeric simulation results (probability of beating the index for N = 1, 5, 10, 20, 30...) not retrieved.
- Bessembinder 2018 table figures for wealth share by number of top stocks (e.g. top 90 stocks) not retrieved.

## 3. South Africa / JSE evidence

### Takeaway
The only hard SA-specific figures found are from an earlier (2019) Bessembinder et al. working paper as reported by Investec, plus index-concentration facts around Naspers/Prosus; I found no JSE-specific random-portfolio dispersion study.

### Cited Findings
- Earlier working-paper version (1990-2018), as reported by Investec: 67.4% of South African equities underperformed US cash in dollar terms and only nine firms generated 100% of net wealth creation above US cash over 29 years — [Investec Focus](https://www.investec.com/en_za/focus/investing/rocket-fuel-the-importance-of-the-1-percent-in-investing.html) (surfaced via search snippet; page returned 403 on fetch, so unverified; may differ from the 2023 final).
- A blog cites the 2023 paper with a South Africa figure of -33.4% but without defining the measure — not usable ([Closelook](https://closelooknet.pages.dev/heresies/dont-buy-global-stocks/)).
- Naspers/Prosus concentration: uncapped SWIX weight of the two combined was 22.5% in 2019; JSE reported exposure to the Naspers "stable" rising from 10% to 12.02% in the Capped SWIX after the Prosus listing (another analysis: 10% to 13.7%); in 2021 the capped SWIX 40 Naspers weight went from 9.50% to 4.9% and Prosus from 1.95% to 6.6% — [BusinessTech](https://businesstech.co.za/technology/514896/jse-adjusts-caps-after-naspers-deal-upends-index/) (URL as surfaced: https://businesstech.co.za/news/technology/514896/jse-adjusts-caps-after-naspers-deal-upends-index/); [BusinessLive 2019](https://www.businesslive.co.za/bd/companies/2019-11-05-jse-asks-public-for-comment-on-joint-capping-of-naspers-and-prosus/); [JSE consultation PDF](https://clientportal.jse.co.za/Content/ICANoticeItems/FTSE-JSE-Africa/20210720%20Market%20Consultation%20Naspers%20Prosus%20Capping%20UPDATED.pdf). All search-summary figures, dated 2019-2021.
- Capped SWIX All Share was introduced in 2016 to reduce Naspers weight — same BusinessTech/JSE sources (search summary).
- Namibian (small, concentrated market) UCT study: minimum ~6 stocks, probably ~10, before extra holdings add little risk reduction — [UCT open access](https://open.uct.ac.za/bitstreams/f6b1e865-705f-4f47-bf61-027545a5baf8/download) (search summary; Namibia not JSE; variance-reduction basis only).

### Inferences
- With a few shares dominating the index, an equal-weighted pick of JSE shares can behave very differently from the cap-weighted index; a client missing Naspers/Prosus will show large tracking difference in either direction. This is my inference; no retrieved source quantifies it.

### Gaps
- No Investment Analysts Journal / SAJBM paper on JSE portfolio size found; none verified. 
- Current (2025-26) top-10 concentration of the FTSE/JSE All Share/SWIX not found.
- Final 2023 South Africa numbers (percent underperforming cash, number of wealth creators) not verified.

## 4. Tracking error / 1-year range of 10-20 stock portfolios vs the index

### Takeaway
I found no source giving a best-vs-worst decile 1-year spread for random 10-20 stock portfolios. The only quantified tracking-error data point is Surz & Price's.

### Cited Findings
- Surz & Price: tracking error at 30 stocks of 6.2 (random) vs 4.2 (optimised) — [typeset.io PDF](https://typeset.io/pdf/the-truth-about-diversification-by-the-numbers-584p2309i3.pdf) (secondary summary; units and index not confirmed).

### Inferences
- If random 30-stock tracking error is ~6%, a 10-20 stock portfolio would plausibly be higher, so a +/- 1 standard deviation annual gap to the index of well over 6 percentage points is plausible, consistent with +18% vs -12%. Illustrative reasoning only, not a sourced figure; recommend running own bootstrap on public JSE price data (no client data) to produce decile spreads for 10/15/20/30 stock portfolios.

### Gaps
- Decile/percentile 1-year spreads by N: not found in any source searched. Recommended: simulate from public JSE constituent data.
