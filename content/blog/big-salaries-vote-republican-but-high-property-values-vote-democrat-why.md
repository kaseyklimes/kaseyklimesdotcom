---
title: Big salaries vote Republican, but high property values vote Democrat. Why?
category: blog
date: 08-08-2017
stars: 1
span: 8
tags: ["blog"]
description: Imagine  two households. The first household, the Millers, make a combined  income of $100,000 a year–decent, livable, but modest compared to many of their n...
heroImage: /images/1IYdpQvBamyh4gpnF_icBsA.png
---

# Big salaries vote Republican, but high property values vote Democrat. Why?
![](/images/1IYdpQvBamyh4gpnF_icBsA-1.png)
Imagine  two households. The first household, the Millers, make a combined  income of $100,000 a year–decent, livable, but modest compared to many of their neighbors. They bought their two-bedroom home ten years ago with an affordable mortgage. Over time, however, their property value has grown dramatically, and today is worth nearly $1 million.

The  Smiths, on the other hand, make far more in annual income; over $250,000 combined. They also bought their house ten years ago, for $400,000. It’s a big house with four bedrooms, but its property value  hasn’t changed much.

With this information alone we can make a pretty good guess as to where the Millers and the Smiths live, and how they vote.

Income is a disputed predictor of political behavior–whether it’s [rich people tending to vote for the ‘traditional’ Republican](https://www.theatlantic.com/business/archive/2012/11/does-your-wage-predict-your-vote/264541/) or the popular narrative of low-income whites voting for Trump in 2016.  A quick dive into county-level American Community Survey (ACS) and 2016 election data, however, supports the traditional narrative that the rich (still) vote Republican, but suggests that property values are a stronger predictor — in the opposite direction. The Millers probably voted Democrat, and the Smiths likely voted Republican.

> 
“A $10,000 increase in median household income is associated with a 3.4 point decrease in Democratic vote share, while a $10,000 increase in median property value corresponds to a 0.5 point increase in Democratic votes.”

Population density, race, education, inequality (as measured by gini), household income, and property values explain about 62% of county-level results in the 2016 presidential election. The strongest predictors, perhaps unsurprisingly, were race and education.
![](/images/1wqEdz38j8wdNTWf8IoJwWw.png)
&nbsp;&nbsp;&nbsp;&nbsp;_&nbsp;&nbsp;&nbsp;&nbsp;_Property value is a strong predictor of political behavior__

What I think _is_ surprising is the results of household income and property values. **Though household income is more frequently discussed, the impact of property  values was more than three times greater than household income!**  A $10,000 increase in median household income is associated with a 3.4  point decrease in Democratic votes, while a $10,000 increase in median _property value_corresponds to a 0.5 point _increase_ in Democratic votes.

While property value may appear to be a proxy for the urban/rural divide (and to some degree it certainly is), the model controls for population  density alongside the other variables mentioned. According to my results, population density has a statistically insignificant  relationship with voting behavior (though it’s possible density is a better predictor at more localized units of geography).

The  relationship between property value and voting behavior is visible when mapped. Short of vote margins, property value is probably the clearest way to delineate the cultural concept of “The Coasts”.
![](/images/1GMl8W_c8tennRIZY7STCXQ.png)
Aside from the less populous mountain region states, the property value map  and the Democratic vote map share several geographic patterns in common.  Notice the vertical band of red stretching from Texas to North Dakota, or the Appalachian mountain range, or the divide between coastal and inland Florida.

The same test on 2004 county presidential election and Census data of the same time period produces similar results — households with high property values generally voted for John Kerry, households with high incomes  voted for George Bush. Like in 2016, the impact of property values on voting  behavior overall was over three times greater than that of incomes.  Between 2004 and 2016, however, the influence of both metrics in absolute terms appears to have increased by about 40%. The relationship  with voting behavior is strengthening (meanwhile, the influence of race  appears to have doubled and the influence of education has quadrupled  since 2004 — are we becoming more predictable?).

So what does it all mean? I’m not an economist but I can think of a couple possibilities.

## **Hypothesis #1 — Voting as Tax Burden Calculus**

Property tax is generally levied at the county level while income tax is most  heavily levied at the federal level. This means the incentive to minimize tax burden could produce diverging voter behavior: high income  places want to minimize income tax, so they vote for a Republican  president.

The  tax burden of high property value places won’t be influenced as directly by income-tax-focused federal policy, so voting Democrat for  president (and perhaps more conservatively at the state and local level,  *cough* [California](http://www.slate.com/blogs/moneybox/2016/09/22/california_s_proposition_13_is_bad_policy_and_here_are_some_graphs_to_show.html) *cough*) might produce the same net tax burden results.

It’s  possible that high property values produce left-leaning voters motivated by a similar tax burden calculus as high-income Republicans  with low property values in Texas, Oklahoma, or Nebraska.

## **Hypothesis #2 — Voting as Property Value Boost**

The  relationship could also work in the other direction, with left-leaning  voters effectively engineering high property values with their voting  behavior. Democratic-voting places tend to have stricter development  regulation, [which limits housing supply and increases housing values](https://pdfs.semanticscholar.org/cfe5/90607928beb1d05020ed3413bd7662d848f3.pdf).

Left-leaning  voters whose wealth is mostly stored in their property have ample  incentive to vote for local regulation that restricts further housing  development. The White House isn’t very involved in this kind of  regulation but local political tribe-identity ostensibly translates to  national politics without much trouble.

---

My guess is both hypothesis #1 and hypothesis #2 are at play. Places with high property value vote Democrat, and Democratic voters create high property values. This is perhaps one sub-dynamic of a larger feedback  loop that makes blue places more blue and red places more red.

I’ll be the first to point out that this is all somewhat back-of-the-napkin analysis. There’s plenty of room for further study to confirm or refute this relationship, and I encourage others to check out the data for  themselves. Census data is available at [nhgis.org](https://www.nhgis.org), and 2016 election data is kindly available from [Tony McGovern’s Github](https://github.com/tonmcg/County_Level_Election_Results_12-16).

---

Below are the results of the multivariate linear regression if you want to dig deeper. Notice that contrary to [popular belief](https://www.washingtonpost.com/news/fact-checker/wp/2015/11/20/rand-pauls-claim-that-cities-and-states-led-by-democrats-have-the-worst-income-inequality/?utm_term=.37384fe3f295), Republican-voting counties tend to have higher income inequality (according to the [gini coefficient](https://en.wikipedia.org/wiki/Gini_coefficient)) than Democratic-voting counties when controlling for other factors.