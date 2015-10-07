#... is passed to orderScensAtBestGuess to obtain ordered_scens if missing
biplot=function(pom,ranges,flip=FALSE,text_overlay=TRUE,
                ordered_scens,...){
  ## Remove NAs, i.e. no crossover found
  pom<-pom[!apply(pom,1,function(x) any(is.na(x))),]
  if(nrow(pom)==0) stop("No breakeven points found for the variables selected")
  
  ranges=as.data.frame(ranges)
  
  if(flip){
    v1 <- colnames(pom)[2]
    v2 <- colnames(pom)[1]
  } else {
    v1 <- colnames(pom)[1]
    v2 <- colnames(pom)[2]
  }
  wvars <- match(c(v1,v2),ranges$Variable)
  
  perc.to.limit <- apply(pom[,c(v1,v2)],1,function(x) max(getNormalised(x,ranges$Best[wvars],ranges$Min[wvars],ranges$Max[wvars])))*100
  
  p=ggplot(aes(x=x1,y=x2),data=data.frame(x1=pom[,v1],x2=pom[,v2],level.of.concern=100-perc.to.limit))+
    geom_point(aes(color=level.of.concern))+
    scale_x_continuous(name=v1)+scale_y_continuous(name=v2)+
    scale_colour_gradient2(name="Level of concern",limits=c(0,100),low="#008800",mid="#FFA500",high="#FF0000",midpoint=50)+
    geom_vline(aes(xintercept=x,linetype="Best guess"),data=data.frame(x=as.numeric(ranges[wvars[1],"Best"])),show_guide=TRUE)+
    geom_hline(aes(yintercept=x,linetype="Best guess"),data=data.frame(x=as.numeric(ranges[wvars[2],"Best"])),show_guide=TRUE)+
    geom_vline(aes(xintercept=x,linetype="Limits"),data=data.frame(x=as.numeric(ranges[wvars[1],c("Min","Max")])),show_guide=TRUE)+
    geom_hline(aes(yintercept=x,linetype="Limits"),data=data.frame(x=as.numeric(ranges[wvars[2],c("Min","Max")])),show_guide=TRUE)+
    scale_linetype_manual(name="Values",values=c("Limits"="solid","Best guess"="dashed"))
    
  if(text_overlay){
      if(missing(ordered_scens)){
        ordered_scens=orderScensAtBestGuess(...)
      }
    
      p=p+annotate("text",x=ranges$Best[wvars[1]],y=ranges$Best[wvars[2]],hjust=-0.1,vjust=-0.5,color="grey50",size=4,
                 label=sprintf("At best guess, %s is higher",ordered_scens[1]))+
      geom_dl(aes(x=x1,y=x2),method=list(cex=0.7,"smart.grid"),color="grey50",
              label=sprintf("At crossover points,\n%s is equal to %s",ordered_scens[1],ordered_scens[2]))
  }
  
  return(p)
}