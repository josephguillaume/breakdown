library(breakdown)
#combined=getCombinedCSV("mar1_combined.csv")
combined=getCombinedCSV("footprint_combined_trade_partners_FI.csv")
equations=combined[-1,c(1,11:ncol(combined))]
header=combined[1,c(1,11:ncol(combined))]
ranges=combined[,1:6]

ranges0=ranges[ranges[,1]=="greenfp_cereals",]
names(ranges0)<-c("Variable","Lower","Min","Best","Max","Upper")
ranges0.text=ranges0

ranges.df=as.data.frame(ranges[-1,],stringsAsFactors=F)
for(i in 2:6) ranges.df[,i]=as.numeric(ranges.df[,i])
names(ranges.df)<-c("Variable","Lower","Min","Best","Max","Upper")
ranges.df=ranges.df[!is.na(ranges.df$Best),]
ranges0=subset(ranges.df,Variable=="greenfp_cereals")

context("plotNPV")

test_that("supports different input formats",{
  #TODO: univariateCrossover requires data.frame, but plotNPV is ok with vector
  #pp=plotNPV(equations[,c(1,3,7)],"greenfp_cereals","total.water.footprint",ranges0.text,c("RD","A0"))

  pp=plotNPV(equations[,c(1,3,7,6)],"greenfp_cereals","total.water.footprint",ranges0.text,header[c(3,7,6)])
  expect_equal(length(pp$layers),6) #3 lines, No annotations
  
  #Don't show annotations if no crossover point
  pp=plotNPV(equations[,c(1,3,7)],"bluefp_milk","total.water.footprint",subset(ranges.df,Variable=="bluefp_milk"),c("RD","A0"))
  expect_equal(length(pp$layers),5) #No annotations
})

pp=plotNPV(equations[,c(1,3,7)],"greenfp_cereals","total.water.footprint",ranges0,c("RD","A0"))
pp2=ggplot_build(pp)
library(proto)

test_that("axes and lines are correct",{
  expect_equal(pp2$panel$ranges[[1]]$x.range,c(-0.6152609, 12.9204789))
  expect_equal(unique(pp2$data[[1]]$x),as.numeric(ranges0[["Best"]]))
  expect_equal(range(pp2$data[[3]]$x),as.numeric(c(ranges0[["Min"]],ranges0[["Max"]])))
  
  
})

test_that("function produced correct data",{
  expect_equal(range(pp2$data[[4]]$x),as.numeric(c(ranges0[["Lower"]],ranges0[["Upper"]]))) #
  expect_equal(range(pp2$data[[5]]$x),as.numeric(c(ranges0[["Lower"]],ranges0[["Upper"]])))
  expect_equal(range(pp2$data[[4]]$y),c(2442.27145583824, 6398.3831063504))
  expect_equal(range(pp2$data[[5]]$y),c(1759.06928296852, 7717.51223255181))
  
  #crossover point label
  expect_equal(pp2$data[[8]]$xintercept,4.19858176273603)
  expect_true(pp$layers[[6]]$geom_params$label=="RD is better" && pp$layers[[6]]$geom_params$hjust==1.1)
  expect_true(pp$layers[[7]]$geom_params$label=="A0 is better" && pp$layers[[7]]$geom_params$hjust==-0.1)
})
