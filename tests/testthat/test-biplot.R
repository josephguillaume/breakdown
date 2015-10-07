library(breakdown)

context("bivariate analysis")

#combined=getCombinedCSV("mar1_combined.csv")
combined=getCombinedCSV("footprint_combined_trade_partners_FI.csv")
equations=combined[-1,c(1,11:ncol(combined))]
header=combined[1,c(1,11:ncol(combined))]
ranges=combined[,1:6]

ranges.df=as.data.frame(ranges[-1,],stringsAsFactors=F)
for(i in 2:6) ranges.df[,i]=as.numeric(ranges.df[,i])
names(ranges.df)<-c("Variable","Lower","Min","Best","Max","Upper")
ranges.df=ranges.df[!is.na(ranges.df$Best),]

ranges2=subset(ranges.df,Variable %in% c("greenfp_meat","greenfp_cereals"))
pom=bivariateCrossover(equations[,c(1,7)],equations[,c(1,3)],"total.water.footprint",ranges=ranges2,n = 100)

test_that("values are correct",{
  expect_equal(range(pom[,"greenfp_meat"]),c(ranges2$Lower[2],ranges2$Upper[2]))
  expect_equal(nrow(pom),100)
  expect_equal(range(pom[,"greenfp_meat"]),c(ranges2$Lower[2],ranges2$Upper[2]))
  #Within ranges
  expect_true(min(pom[,"greenfp_cereals"],na.rm=T)>=ranges2$Lower[1])
  expect_true(max(pom[,"greenfp_cereals"],na.rm=T)<=ranges2$Upper[1])
  expect_identical(as.numeric(pom[44,"greenfp_cereals"]),NA_real_)
})

test_that("orderScensAtBestGuess gives correct answer",{
  expect_equal(orderScensAtBestGuess(equations[,c(1,7,3)],"total.water.footprint",header[c(7,3)]),c("RD","A0"))
  expect_equal(orderScensAtBestGuess(equations,"total.water.footprint",header[-1]),c("OD", "RD", "A50", "A25", "A12.5", "A0"))
})

test_that("biplot is labelled correctly",{
  p=biplot(pom,ranges2,TRUE,text_overlay=FALSE)
  expect_equal(length(p$layers),5) #No labels
  p=biplot(pom,ranges2,TRUE,ordered_scens = c("RD","A0"))
  
  expect_equal(length(p$layers),7)
  expect_equal(p$layers[[6]]$geom_params$label,"At best guess, RD is higher")
  expect_equal(p$layers[[7]]$geom_params$label,"At crossover points,\nRD is equal to A0")
  
  # With calculated scenario order
  p=biplot(pom,ranges2,TRUE,equations=equations[,c(1,7,3)],var="total.water.footprint",scens=header[c(7,3)])  
  expect_equal(length(p$layers),7)
  expect_equal(p$layers[[6]]$geom_params$label,"At best guess, RD is higher")
  expect_equal(p$layers[[7]]$geom_params$label,"At crossover points,\nRD is equal to A0")
})

