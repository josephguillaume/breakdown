library(breakdown)
#combined=getCombinedCSV("mar1_combined.csv")
combined=getCombinedCSV("footprint_combined_trade_partners_FI.csv")
equations=combined[-1,c(1,11:ncol(combined))]
header=combined[1,c(1,11:ncol(combined))]

ranges=combined[,1:6]
ranges.df=as.data.frame(ranges[-1,],stringsAsFactors=F)
for(i in 2:6) ranges.df[,i]=as.numeric(ranges.df[,i])
names(ranges.df)<-c("Variable","Lower","Min","Best","Max","Upper")
ranges.df=ranges.df[!is.na(ranges.df$Best),]

context("univariateCrossover")

test_that("correct crossover values",{
  vals=univariateCrossover(equations[,c(1,7)],equations[,c(1,3)],"total.water.footprint",ranges.df)
  expect_equal(as.numeric(vals),c(NA, 3.33334006073603, NA, NA, NA, NA, NA, NA, NA, NA, NA, NA, 
                                  NA, NA, 4.19858176273603, NA, NA, NA, NA, NA, NA, 26.4313900497186, 
                                  NA, NA, NA, NA))
})

test_that("accepts function",{
  f.scen=evalTermsFun(equations[,c(1,7)],"total.water.footprint",subset.args=FALSE)
  f.baseline=evalTermsFun(equations[,c(1,3)],"total.water.footprint",subset.args=FALSE)
  vals=univariateCrossover(f.scen,f.baseline,"total.water.footprint",ranges.df)
  expect_equal(as.numeric(vals),c(NA, 3.33334006073603, NA, NA, NA, NA, NA, NA, NA, NA, NA, NA, 
                                  NA, NA, 4.19858176273603, NA, NA, NA, NA, NA, NA, 26.4313900497186, 
                                  NA, NA, NA, NA))
})
