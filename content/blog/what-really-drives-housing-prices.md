---
title: What Really Drives Housing Prices?
category: blog
date: 05-02-2023
stars: 2
tags: ["blog"]
description: "Over the weekend, Scott Alexander wrote a post titled Change My Mind: Density Increases Local But Decreases Global Prices."
heroImage: /images/meanincvmeansupply_annotated-1.png
---

# What Really Drives Housing Prices?

Over the weekend, Scott Alexander wrote a post titled ["Change My Mind: Density Increases Local But Decreases Global Prices."](https://open.substack.com/pub/astralcodexten/p/change-my-mind-density-increases?r=1nazl&utm_campaign=post&utm_medium=web)

In his post, Alexander highlights a real (if misleading) correlation between urban density and housing prices.

> 
The two densest US cities, i.e., the cities with the greatest housing supply per square kilometer, are New York City and San Francisco. These are also the 1st and 3rd most expensive cities in the US... So empirically, as you move along the density spectrum from the empty North Dakota plain to Manhattan, housing prices go up.

He goes on to argue that more people prefer to live in big cities than there are available housing units. Given the housing shortage in major cities, this supply/demand mismatch is fairly evident.

However, he goes further to suggest that _this preference for density is what's driving demand_.

> 
For example, if my home city of Oakland (population 500,000) became ten times denser, it would build 4.5 million new units and end up about as dense as Manhattan or London. But Manhattan and London have the highest house prices in their respective countries, primarily because of their density and the opportunities density provides.

If any given city were to build more housing and grow, he reasons, it would become more desirable to a mobile subset of Americans that want to live in big, dense cities—and thus more expensive. The global supply of housing would increase (thus decreasing global prices) but the city in which new housing was built would become proportionally more attractive, offsetting any local benefits to affordability. This is how Alexander explains the correlation between density and housing prices.
![](/images/nyc-4.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Pictured: Lots of housing. Not pictured: Lots of high paying jobs.__

There's something to Alexander's argument. My own research at UC Berkeley found that there is indeed a price premium for housing in dense, walkable neighborhoods relative to metro-wide median property values. At the neighborhood-level, people do prefer density! However, when we're talking about differences in housing costs across metros, these effects are marginal at best.

I appreciate Alexander's epistemic humility on the subject ("_Tell me why I'm wrong!_") so I'll take him up on the request. I suspect his argument is derived from a common [saliency bias](https://www.alleydog.com/glossary/definition.php?term=Saliency+Bias). People see dense housing all around them in expensive cities and believe there must be a causal relationship. Fortunately, we can use data to help us overcome these biases.

## To the data!

Looking at 2017-2021 ACS data for all American Core-Based Statistical Areas (CBSAs), we can see there is indeed some correlative relationship between density and housing values, but it’s not particularly strong.
![](/images/populationvvalue_m-1.png)
Alexander has the causal relationship backwards. Money doesn't follow housing; housing follows money. The money used to bid on housing has to come from somewhere...

Yes, the critical missing piece to Alexander's analysis is _jobs_. The North Dakota plains aren't just lacking housing; they're lacking jobs. If lots of high-paying jobs were to appear, the income they generate would flow into housing. If the supply of housing were limited, its value would increase.

In fact, _this is exactly what happened_ in North Dakota during the [Bakken Formation oil boom](https://slate.com/culture/2016/03/kyle-cassidy-photographs-the-homes-of-oil-workers-in-north-dakota-in-the-bakken-goes-boom.html) of the 2010s. Oil workers who traveled to reap the benefits of expanded oil production arrived to discover houses and apartments renting for $3,000 a month. Many found themselves living in trailers.
![](/images/ie-acullen_nd-rv-park-1.jpg)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Fox Run RV park in Williston, North Dakota, 2015 | Photo by Andrew Cullen / Inside Energy__

While housing prices are the result of many factors, there are three main drivers:

1. 
## The number of available jobs

2. 
## The salaries of those jobs

3. 
## The amount of housing available for those workers

## The number of available jobs

## The salaries of those jobs

## The amount of housing available for those workers

For the purpose of demonstrating this relationship, we can combine variables #1 and #2 into aggregate income, which is the total income from all jobs in a metropolitan area. As expected, aggregate income and total housing supply are closely correlated.
![](/images/incomevsupply_m-1.png)
That isn’t a very user-friendly chart so here’s an interactive version that lets you zoom in.

Metros above the fitted line have either a lot of jobs or higher-paying jobs relative to the number of housing units available. On this side of the line, we find San Jose, San Francisco, and Washington DC.

Metros below the fitted line have a lot of housing relative to their aggregate income. On this side, we find Detroit, Tampa, and Phoenix.

There’s already a pattern emerging here, but let’s make it clearer.

If we turn these two metrics into a single ratio — **aggregate income per unit of housing** — we can plot that against median home values.
![](/images/ratiovvalue_m-1.png)
What we find is a significantly stronger correlation! Aggregate income per unit of housing predicts approximately 56% of the variation in median values at the metro level. We now have an explanation for why San Jose is more expensive than San Francisco despite having lower housing density (one might say it's _because_ of its lower housing density).

Meanwhile, our outliers are exceptions that prove the rule.

Places like Key West, FL, Kahului, HI, and Ocean City, NJ have high property values relative to their aggregate incomes per unit of housing because the income that drives those values up comes from jobs in other places—[these are vacation home markets](https://www.nj.com/entertainment/2018/05/upper_township_nj_vacation_homes.html).

On the other side, we have places with low property values relative to aggregate income per unit of housing. Los Alamos, NM, stands out here. Los Alamos is effectively a company town for Los Alamos National Laboratory (where the atomic bomb was invented during WWII). According to their website, Los Alamos National Laboratory employs 14,150 people. The population of Los Alamos is just shy of 13,000 (some commute from nearby Santa Fe). These are high-paying jobs, but given that there's only one employer in town, the pool of potential buyers is very small, and thus property values are unusually low.
![](/images/LosAlamos_Sign-1.jpg)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Los Alamos: Where Discoveries Are Made! (Unless you want to discover a buyer for your home when Los Alamos National Laboratory isn’t hiring).__

Let’s set these outliers aside by running the data one more time but only including metros with a population larger than 1 million.
![](/images/ratiovvalue_m_metros-1.png)
Sure enough, the relationship gets even stronger! An r-value of 0.9 suggests that over 81% of median home values in large metros can be attributed to aggregate income per unit of housing.

## Change Over Time

OK, comparing metros to one another clarifies the importance of jobs and housing supply in outcomes between regions, but what we really want to know is whether building more housing in a given metro (above and beyond job and wage growth) would lower the cost of housing.

Unfortunately, that didn't happen in any major metro in the last decade, so we don't have a great case study (yes, this is why every city is becoming unaffordable). But we can see that there's a strong relationship between the change in aggregate income per unit of housing and the change in median property value over time, just as there is across cities for a given period of time.
![](/images/changeinratiovchangeinvalue_m-1.png)
This model is even stronger for predicting changes in rents; 74% of these changes can be explained by changes in aggregate income per unit of housing.
![](/images/changeinratiovchangeinrent_m-1.png)
For a far more rigorous analysis of this relationship within a single city over time, please refer to [Erica Fischer](https://twitter.com/enf)’s brilliant work [collecting and analyzing 30 years of for-rent ads in San Francisco](https://experimental-geography.blogspot.com/2016/05/employment-construction-and-cost-of-san.html):
![](/images/fischer_chart-1.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Green Line: # of units, wages, and #of jobs | Purple Stars: median rent in San Francisco__

While it might help reduce the cost of housing, I don't suspect anyone wants aggregate income in their city to fall. Affordable as they may be, the story of cities like Detroit and [St. Louis](https://youtu.be/eWo27mTB4ho?t=603) is not a happy one. 

That leaves us with one big lever: housing supply. The only real way to reduce housing costs is to build more housing for that aggregate income to flow into.

"Build more housing" isn't a singular policy, but a coherent suite of policies that begins to address the challenge on a variety of regulatory fronts. That suite includes [eliminating single-family zoning](https://medium.com/sidewalk-talk/is-it-time-to-end-single-family-zoning-56233d69a25a) (as recently enacted in Minneapolis and Portland), [abolishing parking minimums](https://parkingreform.org/mandates-map/), and updating building codes to allow more efficient use of floor plates with [single-stair apartment buildings](https://slate.com/business/2021/12/staircases-floor-plan-twitter-housing-apartments.html). It may also involve experimentation with [land value tax](https://www.economicpossibility.org/reports/land-value-tax) as a method to incentivize development and reduce land speculation. Less obvious factors like [immigration policy](https://research.newamericaneconomy.org/report/covid19-immigrants-construction-infrastructure/#:~:text=More%20than%20one-third%20of,(264%2C000%20workers) play a role in construction costs.

Perhaps most centrally, the "Build more housing" policy suite must include reforms that address [the vetocracy](https://www.theatlantic.com/ideas/archive/2022/04/local-government-community-input-housing-public-transportation/629625/) that governs housing development in the United States, which co-opts environmental review and community oversight mechanisms to ensure that very little gets built in American cities. As Jerusalem Demsas aptly writes, our communities have become "like a homeowners' association from hell, backed by the force of the law."

How did it get so bad? As a former city planner, it pains me to acknowledge that upstream of this crisis we find the planning profession’s active abdication of power following the reckoning of mid-century urban renewal. As [Thomas Campanella wrote in Places Journal](https://placesjournal.org/article/jane-jacobs-and-the-death-and-life-of-american-planning/?cn-reloaded=1), “Planning in America has been reduced to smallness and timidity, and largely by its own hand.” Addressing the housing crisis will require planners to step up as the adults in the room, becoming a muscular-yet-accountable force for the greater good rather than stewards of homeowner selfishness.

There’s no reason we can’t have wealthy _and_ affordable cities. We just have to increase the denominator of aggregate income per household.
![](/images/meanincvmeansupply_annotated-1.png)
Let’s return to Alexander.

> 
I don't see why Oakland being able to tell a different story of how it reached Manhattan/London density levels ("it was because we were YIMBYs and deliberately cultivated density to lower prices") would make the end result any different from the real Manhattan or London.

I don't see why Oakland being able to tell a different story of how it reached Manhattan/London density levels ("it was because we were YIMBYs and deliberately cultivated density to lower prices") would make the end result any different from the real Manhattan or London.

In fact, the YIMBY story would make a world of difference in the end result! The story of Manhattan and London is one of housing supply lagging behind a dramatic growth of high-paying jobs. Their housing densities mask an even greater density of jobs. When jobs boom, it can be hard for housing supply to keep up, but it’s not impossible. A story in which housing supply keeps up with job growth creates a housing market [more like that of Tokyo](https://twitter.com/KaseyKlimes/status/1545466542447595520?s=20).

Alexander's argument overlooks the critical role of jobs and income in the housing price equation. The data shows us that it's largely the ratio of aggregate income to housing supply that’s really driving housing prices. The key to our affordability crisis is ensuring that housing supply keeps up with local job markets.

Scott Alexander, I hope I've changed your mind.

---

_Notes_

1. You may be surprised to see New York’s relatively moderate home values. At first I thought this may be due to data collection during the pandemic, but I checked the 2007-2011 and 2012-2016 ACS data and it looks basically the same. I suspect this is due to some combination of the New York CBSA boundaries being enormous (see below) and perhaps New York homes being very small.
![](/images/nyc-5.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_New York CBSA boundary__

## Subscribe

Sign up to receive new posts.

…and if you’re interested in a product-oriented newsletter, check out [rhizome r&d on Substack](https://rhizomerd.substack.com).